/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows/types/v1';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  extractStepCommonDefinition,
  type ExtractConfig,
} from '../../../common/steps/extract/extract_step';
import type { ExtractionOutput } from '../../../common/steps/extract/extraction_contract';
import type { ExtractionGlobalConfig, FormatOverride } from '../../extraction_config';

type GetGlobalConfig = () => Promise<ExtractionGlobalConfig>;

const WORKFLOW_POLL_INTERVAL_MS = 1000;
const WORKFLOW_POLL_MAX_ATTEMPTS = 300;

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);

/**
 * Thin interface over WorkflowsManagementApi so we only couple to what we need.
 */
export interface WorkflowRunner {
  getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null>;
  runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest
  ): Promise<string>;
  getWorkflowExecution(
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null>;
}

interface AttachmentResult {
  content?: string;
  content_type?: string;
}

async function extractWithTika(
  esClient: ElasticsearchClient,
  content: string,
  filename: string,
  docId: string | undefined,
  logger: { debug(msg: string, meta?: object): void }
): Promise<ExtractionOutput> {
  logger.debug('Extracting with Tika (ingest attachment processor)', { filename, docId });

  const response = await esClient.transport.request<{
    docs: Array<{ doc: { _source: { attachment?: AttachmentResult } } }>;
  }>({
    method: 'POST',
    path: '/_ingest/pipeline/_simulate',
    body: {
      pipeline: {
        processors: [
          {
            attachment: {
              field: 'data',
              indexed_chars: -1,
              remove_binary: true,
            },
          },
        ],
      },
      docs: [
        {
          _id: docId ?? '_placeholder',
          _source: {
            filename,
            data: content,
          },
        },
      ],
    },
  });

  const attachment = response.docs?.[0]?.doc?._source?.attachment;
  if (!attachment?.content) {
    throw new Error(
      `Tika extraction returned no content for file "${filename}". ` +
        'The file may be empty, corrupted, or in an unsupported format.'
    );
  }

  return {
    content: attachment.content,
    content_type: attachment.content_type,
  };
}

async function discoverExtractionEndpoint(
  esClient: ElasticsearchClient,
  logger: { debug(msg: string, meta?: object): void }
): Promise<string | undefined> {
  try {
    const { endpoints } = await esClient.inference.get({
      inference_id: '_all',
      task_type: 'completion',
    });

    if (!endpoints || endpoints.length === 0) {
      return undefined;
    }

    const typedEndpoints = endpoints as Array<{
      inference_id: string;
      service: string;
      task_type: string;
    }>;

    const elastic = typedEndpoints.find((ep) => ep.service === 'elastic');
    if (elastic) return elastic.inference_id;

    return typedEndpoints[0].inference_id;
  } catch (error) {
    logger.debug('Failed to discover extraction inference endpoints', error as object);
    return undefined;
  }
}

async function extractWithInference(
  esClient: ElasticsearchClient,
  content: string,
  filename: string,
  inferenceId: string | undefined,
  logger: {
    debug(msg: string, meta?: object): void;
    info(msg: string, meta?: object): void;
  }
): Promise<ExtractionOutput> {
  let endpointId = inferenceId;

  if (!endpointId) {
    logger.info('No inference_id provided, discovering available extraction endpoints');
    endpointId = await discoverExtractionEndpoint(esClient, logger);

    if (!endpointId) {
      throw new Error(
        'No inference_id provided and no completion inference endpoints found. ' +
          'Please configure an inference endpoint or switch to the "tika" method.'
      );
    }

    logger.debug(`Discovered extraction endpoint: ${endpointId}`);
  }

  logger.debug('Extracting with inference endpoint', { endpointId, filename });

  const prompt =
    `Extract all text content from the following base64-encoded file named "${filename}". ` +
    `Return only the extracted text, no commentary or formatting.\n\n${content}`;

  const response = await esClient.inference.inference({
    inference_id: endpointId,
    task_type: 'completion',
    input: prompt,
    timeout: '5m',
  });

  const completion = response as unknown as {
    completion?: Array<{ result?: string }>;
  };
  const result = completion?.completion?.[0]?.result;

  if (!result) {
    throw new Error(
      `Inference endpoint "${endpointId}" returned no content for file "${filename}".`
    );
  }

  return { content: result };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a user-defined extraction workflow and poll until it completes.
 * The workflow must conform to the extraction contract (see extraction_contract.ts).
 */
async function extractWithWorkflow(
  runner: WorkflowRunner,
  workflowId: string,
  content: string,
  filename: string,
  docId: string | undefined,
  spaceId: string,
  request: KibanaRequest,
  logger: {
    debug(msg: string, meta?: object): void;
    info(msg: string, meta?: object): void;
  }
): Promise<ExtractionOutput> {
  logger.info('Extracting with custom workflow', { workflowId, filename });

  const workflow = await runner.getWorkflow(workflowId, spaceId);
  if (!workflow) {
    throw new Error(
      `Extraction workflow "${workflowId}" not found. ` +
        'Verify the workflow ID in your extraction settings.'
    );
  }
  if (!workflow.enabled) {
    throw new Error(`Extraction workflow "${workflowId}" is disabled. Enable it to use it.`);
  }
  if (!workflow.valid) {
    throw new Error(`Extraction workflow "${workflowId}" has validation errors.`);
  }

  const inputs: Record<string, unknown> = { content, filename };
  if (docId) {
    inputs.doc_id = docId;
  }

  const engineModel: WorkflowExecutionEngineModel = {
    id: workflow.id,
    name: workflow.name,
    enabled: workflow.enabled,
    definition: workflow.definition ?? undefined,
    yaml: workflow.yaml,
  };

  const executionId = await runner.runWorkflow(engineModel, spaceId, inputs, request);

  logger.debug(`Extraction workflow started, execution: ${executionId}`);

  for (let attempt = 0; attempt < WORKFLOW_POLL_MAX_ATTEMPTS; attempt++) {
    await delay(WORKFLOW_POLL_INTERVAL_MS);

    const execution = await runner.getWorkflowExecution(executionId, spaceId, {
      includeOutput: true,
    });

    if (!execution) {
      throw new Error(`Extraction workflow execution "${executionId}" disappeared.`);
    }

    if (!TERMINAL_STATUSES.has(execution.status)) {
      continue;
    }

    if (execution.status !== 'completed') {
      const errorMsg = execution.error?.message ?? `Workflow finished with status: ${execution.status}`;
      throw new Error(`Extraction workflow "${workflowId}" failed: ${errorMsg}`);
    }

    const output = extractOutputFromExecution(execution);
    if (!output?.content) {
      throw new Error(
        `Extraction workflow "${workflowId}" completed but returned no content. ` +
          'Ensure the workflow outputs "content" (string) and optionally "content_type" (string).'
      );
    }

    return output;
  }

  throw new Error(
    `Extraction workflow "${workflowId}" timed out after ${WORKFLOW_POLL_MAX_ATTEMPTS} poll attempts.`
  );
}

/**
 * Pull `{ content, content_type }` from a completed workflow execution.
 * Checks workflow-level output first (from a `workflow.output` step),
 * then falls back to the last step execution's output.
 */
function extractOutputFromExecution(execution: WorkflowExecutionDto): ExtractionOutput | undefined {
  const steps = execution.stepExecutions ?? [];
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : undefined;
  const raw = (lastStep?.output ?? undefined) as Record<string, unknown> | undefined;

  if (!raw) return undefined;

  const text = typeof raw.content === 'string' ? raw.content : undefined;
  if (!text) return undefined;

  return {
    content: text,
    content_type: typeof raw.content_type === 'string' ? raw.content_type : undefined,
  };
}

export const createExtractStepDefinition = (
  getGlobalConfig: GetGlobalConfig,
  workflowRunner?: WorkflowRunner
) =>
  createServerStepDefinition({
    ...extractStepCommonDefinition,
    handler: async (context) => {
      try {
        const esClient = context.contextManager.getScopedEsClient();
        const { content, filename, doc_id: docId } = context.input;

        context.logger.debug('Extract step started', { filename, docId });

        const globalConfig = await getGlobalConfig();
        const method = resolveMethod(context.config, globalConfig, filename);

        let result: ExtractionOutput;

        if (method === 'workflow') {
          const workflowId = resolveWorkflowId(context.config, globalConfig, filename);
          if (!workflowId) {
            throw new Error(
              'method is "workflow" but no workflow_id is configured. ' +
                'Set a workflow_id in the step config or global extraction settings.'
            );
          }
          if (!workflowRunner) {
            throw new Error(
              'Workflow execution is not available. ' +
                'Ensure the workflowsManagement plugin is enabled.'
            );
          }
          const stepContext = context.contextManager.getContext();
          const spaceId = stepContext.workflow?.spaceId ?? 'default';
          const request = context.contextManager.getFakeRequest();

          result = await extractWithWorkflow(
            workflowRunner,
            workflowId,
            content,
            filename,
            docId,
            spaceId,
            request,
            context.logger
          );
        } else if (method === 'inference') {
          const inferenceId = resolveInferenceId(context.config, globalConfig, filename);
          result = await extractWithInference(
            esClient,
            content,
            filename,
            inferenceId,
            context.logger
          );
        } else if (method === 'connector') {
          throw new Error(
            'method "connector" is not yet implemented. ' +
              'Use "tika", "inference", or "workflow" instead.'
          );
        } else {
          result = await extractWithTika(esClient, content, filename, docId, context.logger);
        }

        context.logger.info('Extract step completed', {
          filename,
          method,
          contentLength: result.content.length,
          contentType: result.content_type,
        });

        return { output: result };
      } catch (error) {
        context.logger.error('Extract step failed', error as Error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });

/**
 * Extract the file extension from a filename, normalized to lowercase with leading dot.
 * e.g. "report.PDF" -> ".pdf", "archive.tar.gz" -> ".gz"
 */
function getFileExtension(filename: string): string | undefined {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return undefined;
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Look up a format override by file extension. Matches both ".pdf" and "pdf" keys.
 */
function getFormatOverride(
  globalConfig: ExtractionGlobalConfig,
  filename: string
): FormatOverride | undefined {
  const { formatOverrides } = globalConfig;
  if (!formatOverrides) return undefined;

  const ext = getFileExtension(filename);
  if (!ext) return undefined;

  return formatOverrides[ext] ?? formatOverrides[ext.substring(1)];
}

/**
 * Resolution chain: step-level YAML > format override > global default > hardcoded fallback
 */
function resolveMethod(
  stepConfig: ExtractConfig | undefined,
  globalConfig: ExtractionGlobalConfig,
  filename: string
): 'tika' | 'inference' | 'workflow' | 'connector' {
  if (stepConfig?.method) return stepConfig.method;

  const formatOverride = getFormatOverride(globalConfig, filename);
  if (formatOverride?.method) return formatOverride.method;

  return globalConfig.method ?? 'tika';
}

function resolveInferenceId(
  stepConfig: ExtractConfig | undefined,
  globalConfig: ExtractionGlobalConfig,
  filename: string
): string | undefined {
  if (stepConfig?.inference_id) return stepConfig.inference_id;

  const formatOverride = getFormatOverride(globalConfig, filename);
  if (formatOverride?.inferenceId) return formatOverride.inferenceId;

  return globalConfig.inferenceId;
}

function resolveWorkflowId(
  stepConfig: ExtractConfig | undefined,
  globalConfig: ExtractionGlobalConfig,
  filename: string
): string | undefined {
  if (stepConfig?.workflow_id) return stepConfig.workflow_id;

  const formatOverride = getFormatOverride(globalConfig, filename);
  if (formatOverride?.workflowId) return formatOverride.workflowId;

  return globalConfig.workflowId;
}
