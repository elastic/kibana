/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EvalFetch } from './scoring/ecs_fields';
import type { AutomaticImportRunOutput, SimulatedLine } from './types';

// Inlined from the automatic_import plugin to avoid a package-to-plugin import.
const INTEGRATIONS_PATH = '/api/automatic_import/integrations';
const VERSION_HEADERS = { 'elastic-api-version': '1' };

const POLL_INTERVAL_MS = 10_000;
/**
 * Task Manager stops the analysis after 30 minutes and marks it cancelled; this only catches a
 * status that never changes, so it can't cut off an analysis that would still finish.
 */
const ANALYSIS_TIMEOUT_MS = 35 * 60_000;
/** Kibana requests have no timeout of their own, so one stuck request could stall the run. */
const REQUEST_TIMEOUT_MS = 60_000;

/** The analysis span is exported when the task ends, so it can be indexed after the status says completed. */
const TRACE_LOOKUP_INTERVAL_MS = 10_000;
const MAX_TRACE_LOOKUP_ATTEMPTS = 6;

interface IntegrationResponse {
  integrationResponse: {
    dataStreams: Array<{ dataStreamId: string; status: string }>;
  };
}

interface ResultsResponse {
  ingest_pipeline: estypes.IngestPipeline;
}

interface EsqlResponse {
  values: unknown[][];
}

export interface AnalyzeParams {
  readonly integrationId: string;
  readonly dataStreamId: string;
  readonly title: string;
  readonly description: string;
  readonly lines: readonly string[];
  readonly connectorId: string;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Runs Automatic Import end to end through its HTTP API and re-simulates the result. */
export class AutomaticImportClient {
  constructor(
    private readonly fetch: EvalFetch,
    private readonly esClient: Client,
    private readonly traceEsClient: Client,
    private readonly log: ToolingLog
  ) {}

  public async analyze(params: AnalyzeParams): Promise<AutomaticImportRunOutput> {
    const { integrationId } = params;
    const output = await this.run(params);
    // Task Manager retries a failed analysis after 30 seconds; deleting first removes the task before then.
    await this.deleteIntegration(integrationId);
    return { ...output, runId: integrationId, traceId: await this.findTraceId(integrationId) };
  }

  private async run(params: AnalyzeParams): Promise<Omit<AutomaticImportRunOutput, 'runId'>> {
    const { integrationId, dataStreamId } = params;
    try {
      const pipeline = await this.generatePipeline(params);
      const lines = await this.simulate(pipeline, params.lines);
      return { status: 'completed', lines };
    } catch (error) {
      this.log.warning(`[automatic_import] ${integrationId}/${dataStreamId} failed: ${error}`);
      return { status: 'failed', error: errorMessage(error), lines: [] };
    }
  }

  /** Finds the trace of the background analysis task, which holds its model calls and token usage. */
  private async findTraceId(integrationId: string): Promise<string | undefined> {
    const query = `FROM traces-*
      | WHERE attributes.automatic_import.integration_id == "${integrationId}"
      | SORT @timestamp DESC
      | KEEP trace.id
      | LIMIT 1`;
    for (let attempt = 1; attempt <= MAX_TRACE_LOOKUP_ATTEMPTS; attempt++) {
      try {
        const { values } = (await this.traceEsClient.esql.query({
          query,
        })) as unknown as EsqlResponse;
        const [traceId] = values[0] ?? [];
        if (typeof traceId === 'string') {
          return traceId;
        }
      } catch (error) {
        // The attribute column doesn't exist until the first analysis span is indexed.
        this.log.debug(`[automatic_import] Trace lookup for ${integrationId} failed: ${error}`);
      }
      await sleep(TRACE_LOOKUP_INTERVAL_MS);
    }
    this.log.warning(`[automatic_import] No analysis trace found for ${integrationId}`);
    return undefined;
  }

  private async generatePipeline({
    integrationId,
    dataStreamId,
    title,
    description,
    lines,
    connectorId,
  }: AnalyzeParams): Promise<estypes.IngestPipeline> {
    const dataStreamPath = `${INTEGRATIONS_PATH}/${integrationId}/data_streams/${dataStreamId}`;

    // Samples go first: creating the integration schedules the analysis immediately.
    await this.request(`${dataStreamPath}/upload`, {
      method: 'POST',
      body: JSON.stringify({
        samples: lines,
        originalSource: { sourceType: 'file', sourceValue: `${dataStreamId}.log` },
      }),
    });

    await this.request(INTEGRATIONS_PATH, {
      method: 'PUT',
      body: JSON.stringify({
        connectorId,
        integrationId,
        title,
        description,
        dataStreams: [{ dataStreamId, title, description, inputTypes: [{ name: 'filestream' }] }],
      }),
    });

    await this.waitForAnalysis(integrationId, dataStreamId);

    const {
      ingest_pipeline: { processors, on_failure: onFailure },
    } = (await this.request(`${dataStreamPath}/results`, { method: 'GET' })) as ResultsResponse;
    // The stored pipeline can include a `name`, which the simulate API rejects.
    return { processors, on_failure: onFailure };
  }

  private async waitForAnalysis(integrationId: string, dataStreamId: string): Promise<void> {
    const deadline = Date.now() + ANALYSIS_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const status = await this.getStatus(integrationId, dataStreamId).catch((error) => {
        this.log.debug(`[automatic_import] Status check for ${integrationId} failed: ${error}`);
        return undefined;
      });

      if (status === 'completed') {
        return;
      }
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Analysis ${status}`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(`Analysis did not finish within ${ANALYSIS_TIMEOUT_MS / 60_000} minutes`);
  }

  private async getStatus(
    integrationId: string,
    dataStreamId: string
  ): Promise<string | undefined> {
    const {
      integrationResponse: { dataStreams },
    } = (await this.request(`${INTEGRATIONS_PATH}/${integrationId}`, {
      method: 'GET',
    })) as IntegrationResponse;
    return dataStreams.find((dataStream) => dataStream.dataStreamId === dataStreamId)?.status;
  }

  private request(path: string, options: Record<string, unknown>): Promise<unknown> {
    return this.fetch(path, {
      ...options,
      headers: VERSION_HEADERS,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  /** Runs the pipeline on every line, the same way Automatic Import does, so outputs line up with inputs. */
  private async simulate(
    pipeline: estypes.IngestPipeline,
    lines: readonly string[]
  ): Promise<SimulatedLine[]> {
    const { docs } = await this.esClient.ingest.simulate({
      pipeline,
      docs: lines.map((line) => ({ _source: { message: line } })),
    });
    return docs.map((result): SimulatedLine => {
      if (!result) {
        return { error: 'Document was dropped by the pipeline' };
      }
      if (result.error) {
        return { error: result.error.reason ?? result.error.type };
      }
      const source = result.doc?._source;
      if (!source) {
        return { error: 'Pipeline returned no document' };
      }
      if (source.error) {
        return { error: JSON.stringify(source.error) };
      }
      return { doc: source };
    });
  }

  private async deleteIntegration(integrationId: string): Promise<void> {
    try {
      await this.request(`${INTEGRATIONS_PATH}/${integrationId}`, { method: 'DELETE' });
    } catch (error) {
      this.log.warning(`[automatic_import] Failed to delete ${integrationId}: ${error}`);
    }
  }
}
