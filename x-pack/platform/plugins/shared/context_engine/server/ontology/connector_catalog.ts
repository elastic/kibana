/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  MAX_CONNECTOR_PARAMS_LENGTH,
  MAX_CONNECTOR_SAMPLE_CALLS,
  ONTOLOGY_FINGERPRINT_ATTRIBUTE,
  ONTOLOGY_PROFILED_AT_ATTRIBUTE,
  connectorDatasetName,
  type ResolvedOntologyConfig,
} from '../../common/ontology';
import type {
  CatalogConnectorSourceOutput,
  SampleConnectorSourceOutput,
} from '../../common/step_types/connector_ontology';
import { parseIntervalMinutes } from '../../common/validation';
import { baseContent } from '../dreaming/access_patterns';
import {
  callConnector,
  connectorFieldsOf,
  connectorFingerprintOf,
  renderSample,
  type ConnectorActionsClient,
  type ConnectorSourceInfo,
} from './connector';
import { otherDatasetsOf, readOntologyKis, sourceIdsOf, toExistingOntologyKi } from './existing';
import { datasetKiId } from './ids';

const MINUTE_MS = 60 * 1000;

const isOlderThan = (date: unknown, minutes: number, now: Date): boolean =>
  typeof date !== 'string' ||
  Number.isNaN(Date.parse(date)) ||
  now.getTime() - Date.parse(date) >= minutes * MINUTE_MS;

/**
 * What a connector source can read, and whether to describe it this run: it has no dataset KI
 * yet, its read sub-actions changed, its description is older than the refresh interval, or
 * another source described it. Calls nothing on the connector.
 */
export const catalogConnectorSource = async ({
  esClient,
  dest,
  spaceId,
  sourceId,
  info,
  config,
  now = new Date(),
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  spaceId: string;
  sourceId: string;
  info: ConnectorSourceInfo;
  config: ResolvedOntologyConfig;
  now?: Date;
  abortSignal?: AbortSignal;
}): Promise<CatalogConnectorSourceOutput> => {
  const name = connectorDatasetName(info.id);
  const id = datasetKiId(name);
  const existing = await readOntologyKis({ esClient, dest, spaceId, abortSignal });
  const current = existing.find((ki) => ki.id === id);
  const fingerprint = connectorFingerprintOf(info);
  const refreshMinutes = parseIntervalMinutes(config.refreshInterval) ?? Infinity;
  const reason = !current
    ? ('new' as const)
    : current.attributes?.[ONTOLOGY_FINGERPRINT_ATTRIBUTE] !== fingerprint
    ? ('mapping_changed' as const)
    : isOlderThan(current.attributes?.[ONTOLOGY_PROFILED_AT_ATTRIBUTE], refreshMinutes, now) ||
      !sourceIdsOf(current).includes(sourceId)
    ? ('refresh' as const)
    : undefined;
  const skipped =
    info.tools.length === 0
      ? 'The connector has no read sub-actions agents may call.'
      : reason === undefined
      ? 'unchanged'
      : undefined;
  const currentContent = baseContent(current?.content);
  return {
    describe: skipped === undefined,
    datasets:
      skipped === undefined && reason !== undefined
        ? [
            {
              name,
              kind: 'connector' as const,
              id,
              title: info.name,
              fingerprint,
              reason,
              fields: [],
              omitted_fields: 0,
              ...(current && {
                current: {
                  ...(current.description !== undefined && { description: current.description }),
                  ...(currentContent !== undefined && { content: currentContent }),
                },
              }),
              errors: [],
            },
          ]
        : [],
    connector: {
      id: info.id,
      name: info.name,
      type: info.type,
      description: info.description,
      ...(info.skill !== undefined && { skill: info.skill }),
    },
    tools: info.tools,
    others: otherDatasetsOf(existing, new Set([name])),
    existing: existing.map(toExistingOntologyKi),
    ...(skipped !== undefined && { skipped }),
    source: { id: sourceId, type: 'connector', value: info.id, datasets: 1 },
  };
};

const paramsOf = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value ?? {};
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

/**
 * Runs the sample calls a model planned on a connector source, only read sub-actions with valid
 * params, and catalogs the record fields their results hold.
 */
export const sampleConnectorSource = async ({
  actionsClient,
  info,
  sourceId,
  calls,
  valueSamples,
}: {
  actionsClient: ConnectorActionsClient;
  info: ConnectorSourceInfo;
  sourceId: string;
  calls: readonly unknown[];
  valueSamples: boolean;
}): Promise<SampleConnectorSourceOutput> => {
  const samples: SampleConnectorSourceOutput['samples'] = [];
  const rejected: SampleConnectorSourceOutput['rejected'] = [];
  const succeeded: Array<{ sub_action: string; data: unknown }> = [];
  for (const raw of calls) {
    const call = (raw ?? {}) as { sub_action?: unknown; params?: unknown };
    const label = JSON.stringify(raw)?.slice(0, 200) ?? 'null';
    if (typeof call.sub_action !== 'string') {
      rejected.push({ call: label, reason: 'it names no sub_action' });
      continue;
    }
    const params = paramsOf(call.params);
    const serialized = JSON.stringify(params) ?? '';
    if (params === undefined || serialized.length > MAX_CONNECTOR_PARAMS_LENGTH) {
      rejected.push({ call: label, reason: 'its params are not JSON, or are too long' });
      continue;
    }
    if (samples.length >= MAX_CONNECTOR_SAMPLE_CALLS) {
      rejected.push({ call: label, reason: `over the cap of ${MAX_CONNECTOR_SAMPLE_CALLS} calls` });
      continue;
    }
    const result = await callConnector(actionsClient, info, call.sub_action, params);
    if (result.ok) {
      succeeded.push({ sub_action: call.sub_action, data: result.data });
      samples.push({
        sub_action: call.sub_action,
        params: serialized,
        ok: true,
        sample: renderSample(result.data, valueSamples),
      });
    } else {
      samples.push({
        sub_action: call.sub_action,
        params: serialized,
        ok: false,
        error: result.error,
      });
    }
  }
  return {
    samples,
    catalog: [
      {
        name: connectorDatasetName(info.id),
        kind: 'connector',
        source_ids: [sourceId],
        fields: connectorFieldsOf(succeeded, valueSamples),
      },
    ],
    rejected,
  };
};
