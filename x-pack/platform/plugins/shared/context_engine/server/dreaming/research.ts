/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import {
  getConnectorSpec,
  isSelectedActionEnabled,
  isToolAction,
  type ConnectorSpec,
  type SelectedActions,
} from '@kbn/connector-specs';
import { z, inlineRootJsonSchemaRef } from '@kbn/zod/v4';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import {
  CONNECTOR_SOURCE_REF_PREFIX,
  DEFAULT_RESEARCH_RESULTS_PER_SEARCH,
  ESQL_SOURCE_REF_PREFIX,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_RESEARCH_RESULTS_PER_SEARCH,
  type Evidence,
  type ResearchError,
  type ResearchSearch,
} from '../../common/step_types/research';
import { MAX_KI_REFERENCE_URI_LENGTH, MAX_KI_TITLE_LENGTH } from '../../common/step_types/ki';
import { parseFromClause } from '../tasks/transform';
import { shortHash } from './ids';

/** The actions client methods research uses. */
export type ResearchActionsClient = Pick<ActionsClient, 'get' | 'execute'>;

export interface ResearchSubAction {
  name: string;
  description: string;
  /** The parameters, one per line, as the model reads them. */
  params: string;
}

/** A source of an AI index as the research model sees it. */
export interface ResearchSource {
  ref: string;
  type: AiIndexSource['type'];
  name: string;
  description: string;
  /** For an ES|QL source: the indices its `FROM` reads. */
  indices?: string[];
  /** For a connector source: the read-only sub-actions research may run. */
  sub_actions?: ResearchSubAction[];
  /** For a connector source: how to use its sub-actions, from the connector type. */
  guidance?: string;
  /** Why the source cannot be searched; research skips it. */
  error?: string;
}

const MAX_GUIDANCE_LENGTH = 4000;
const MAX_PARAM_DESCRIPTION_LENGTH = 300;
const ID_HASH_LENGTH = 8;

const TITLE_FIELDS = ['title', 'name', 'subject', 'summary', 'displayName', 'key', 'filename'];
const URL_FIELDS = ['url', 'html_url', 'webViewLink', 'web_url', 'webUrl', 'permalink', 'link'];
/** Fields an indexed document carries for search engines rather than for readers. */
const EXCLUDED_SOURCE_FIELDS = ['*.inference', '*.inference.*', '*embedding*', '*vector*'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const truncate = (text: string, length: number): string =>
  text.length <= length ? text : `${text.slice(0, length - 1)}…`;

export const esqlSourceRef = (query: string): string =>
  `${ESQL_SOURCE_REF_PREFIX}${shortHash(query).slice(0, ID_HASH_LENGTH)}`;

export const connectorSourceRef = (connectorId: string): string =>
  `${CONNECTOR_SOURCE_REF_PREFIX}${connectorId}`;

export const evidenceId = (uri: string): string => `e-${shortHash(uri).slice(0, ID_HASH_LENGTH)}`;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The indices of an ES|QL source, from its `FROM` clause. */
export const indicesOfEsqlSource = (query: string): string[] =>
  (parseFromClause(query) ?? '')
    .split(',')
    .map((expression) => expression.trim())
    .filter((expression) => expression.length > 0);

/** The parameters of a sub-action, one per line, as the model reads them. */
export const describeParams = (input: z.ZodType | undefined): string => {
  if (!input) {
    return 'No parameters';
  }
  try {
    const schema = inlineRootJsonSchemaRef(z.toJSONSchema(input) as Record<string, unknown>);
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
    const lines = Object.entries(properties).map(([name, property]) => {
      const { type, description, enum: values } = isRecord(property) ? property : {};
      const kind = Array.isArray(values)
        ? values.map((value) => JSON.stringify(value)).join(' | ')
        : typeof type === 'string'
        ? type
        : 'any';
      const presence =
        required.has(name) && !('default' in (property as object)) ? 'required' : 'optional';
      const text =
        typeof description === 'string'
          ? `: ${truncate(description, MAX_PARAM_DESCRIPTION_LENGTH)}`
          : '';
      return `- ${name} (${kind}, ${presence})${text}`;
    });
    return lines.length > 0 ? lines.join('\n') : 'No parameters';
  } catch {
    return 'Parameters could not be described';
  }
};

/**
 * The sub-actions of a connector research may run: tools that only read and are enabled on the
 * connector. Research runs unattended, so anything that writes is never offered.
 */
export const readOnlySubActions = (
  spec: ConnectorSpec,
  selectedActions: SelectedActions
): ResearchSubAction[] =>
  Object.entries(spec.actions)
    .filter(
      ([name, action]) =>
        action.scope === 'read' &&
        isToolAction(spec, name) &&
        isSelectedActionEnabled(name, selectedActions)
    )
    .map(([name, action]) => ({
      name,
      description: action.description ?? name,
      params: describeParams(action.input),
    }));

interface ResolvedConnector {
  id: string;
  name: string;
  actionTypeId: string;
  spec?: ConnectorSpec;
  subActions: ResearchSubAction[];
}

const resolveConnector = async (
  actionsClient: ResearchActionsClient,
  connectorId: string
): Promise<ResolvedConnector> => {
  const connector = await actionsClient.get({ id: connectorId });
  const spec = getConnectorSpec(connector.actionTypeId);
  return {
    id: connector.id,
    name: connector.name,
    actionTypeId: connector.actionTypeId,
    spec,
    subActions: spec
      ? readOnlySubActions(spec, connector.config?.selectedActions as SelectedActions)
      : [],
  };
};

const describeEsqlSource = (query: string): ResearchSource => {
  const indices = indicesOfEsqlSource(query);
  return {
    ref: esqlSourceRef(query),
    type: 'esql',
    name: query,
    description: `Full-text search over ${indices.join(', ') || 'no index'}`,
    indices,
    ...(indices.length === 0 && { error: 'The ES|QL source has no FROM clause to search.' }),
  };
};

const describeConnectorSource = async (
  actionsClient: ResearchActionsClient,
  connectorId: string
): Promise<ResearchSource> => {
  const ref = connectorSourceRef(connectorId);
  try {
    const connector = await resolveConnector(actionsClient, connectorId);
    const base = {
      ref,
      type: 'connector' as const,
      name: connector.name,
      description: connector.spec?.metadata.description ?? connector.name,
    };
    if (!connector.spec) {
      return {
        ...base,
        error: `Connector type '${connector.actionTypeId}' has no sub-actions research can run.`,
      };
    }
    if (connector.subActions.length === 0) {
      return { ...base, error: 'The connector has no read-only sub-actions enabled.' };
    }
    return {
      ...base,
      sub_actions: connector.subActions,
      ...(connector.spec.skill && {
        guidance: truncate(connector.spec.skill, MAX_GUIDANCE_LENGTH),
      }),
    };
  } catch (error) {
    return {
      ref,
      type: 'connector',
      name: connectorId,
      description: connectorId,
      error: `The connector cannot be read: ${errorMessage(error)}`,
    };
  }
};

/** The research source catalog of an AI index: each source, and what research can do with it. */
export const describeResearchSources = async ({
  sources,
  actionsClient,
}: {
  sources: readonly AiIndexSource[];
  actionsClient: ResearchActionsClient;
}): Promise<ResearchSource[]> => {
  const described: ResearchSource[] = [];
  const seen = new Set<string>();
  for (const { type, value } of sources) {
    const ref = type === 'esql' ? esqlSourceRef(value) : connectorSourceRef(value);
    if (seen.has(ref)) {
      continue;
    }
    seen.add(ref);
    described.push(
      type === 'esql'
        ? describeEsqlSource(value)
        : await describeConnectorSource(actionsClient, value)
    );
  }
  return described;
};

const firstString = (record: Record<string, unknown>, fields: readonly string[]) =>
  fields
    .map((field) => record[field])
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

const titleOf = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const title = firstString(value, TITLE_FIELDS);
  return title !== undefined ? truncate(title, MAX_KI_TITLE_LENGTH) : undefined;
};

const textOf = (value: unknown): string =>
  truncate(
    typeof value === 'string' ? value : JSON.stringify(value) ?? '',
    MAX_EVIDENCE_TEXT_LENGTH
  );

/**
 * The results in a connector response: its top-level array, or the first array of objects one
 * or two levels down, such as `results` or `hits.hits`. Otherwise the whole response.
 */
export const resultsOf = (data: unknown): unknown[] => {
  if (Array.isArray(data)) {
    return data;
  }
  if (!isRecord(data)) {
    return data === undefined || data === null ? [] : [data];
  }
  const arrayIn = (record: Record<string, unknown>) =>
    Object.values(record).find(
      (value): value is unknown[] =>
        Array.isArray(value) && value.length > 0 && value.every(isRecord)
    );
  const nested = Object.values(data)
    .filter(isRecord)
    .map(arrayIn)
    .find((value) => value !== undefined);
  return arrayIn(data) ?? nested ?? [data];
};

const connectorResultUri = (connectorId: string, subAction: string, result: unknown): string => {
  const url = isRecord(result) ? firstString(result, URL_FIELDS) : undefined;
  return url !== undefined && url.length <= MAX_KI_REFERENCE_URI_LENGTH
    ? url
    : `connector://${connectorId}/${subAction}/${shortHash(JSON.stringify(result) ?? '').slice(
        0,
        ID_HASH_LENGTH
      )}`;
};

const toEvidence = (source: string, uri: string, value: unknown): Evidence => {
  const title = titleOf(value);
  return {
    id: evidenceId(uri),
    source,
    uri,
    ...(title !== undefined && { title }),
    text: textOf(value),
  };
};

const isAbort = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'RequestAbortedError');

const searchIndices = async ({
  esClient,
  indices,
  query,
  size,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  query: string;
  size: number;
  abortSignal?: AbortSignal;
}) => {
  const request = (fullText: Record<string, unknown>) =>
    esClient.search(
      {
        index: indices.join(','),
        size,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: fullText,
        _source: { excludes: EXCLUDED_SOURCE_FIELDS },
      },
      { signal: abortSignal }
    );
  try {
    return await request({ multi_match: { query, lenient: true } });
  } catch (error) {
    if (isAbort(error)) {
      throw error;
    }
    return request({ simple_query_string: { query, lenient: true } });
  }
};

/** The parameters of a connector search: an object, a JSON object string, or none. */
export const paramsOf = (params: ResearchSearch['params']): Record<string, unknown> => {
  if (params === undefined || (typeof params === 'string' && params.trim() === '')) {
    return {};
  }
  if (typeof params !== 'string') {
    return params;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(params);
  } catch {
    throw new Error('params is not valid JSON.');
  }
  if (!isRecord(parsed)) {
    throw new Error('params must be a JSON object.');
  }
  return parsed;
};

/** What a round of searches found. */
export interface ResearchResult {
  evidence: Evidence[];
  errors: ResearchError[];
}

/**
 * Runs the searches the research model asked for against the sources of an AI index. An ES|QL
 * source is searched full-text across the indices of its `FROM`, as the workflow user; a
 * connector source runs one of its read-only sub-actions. A search that fails is reported in
 * `errors` and does not stop the others. Evidence already found, or listed in `skip`, is left out.
 */
export const runResearchSearches = async ({
  sources,
  searches,
  esClient,
  actionsClient,
  resultsPerSearch = DEFAULT_RESEARCH_RESULTS_PER_SEARCH,
  skip = [],
  logger,
  abortSignal,
}: {
  sources: readonly AiIndexSource[];
  searches: readonly ResearchSearch[];
  esClient: ElasticsearchClient;
  actionsClient: ResearchActionsClient;
  resultsPerSearch?: number;
  skip?: readonly string[];
  logger: Logger;
  abortSignal?: AbortSignal;
}): Promise<ResearchResult> => {
  const size = Math.min(Math.max(1, resultsPerSearch), MAX_RESEARCH_RESULTS_PER_SEARCH);
  const esqlSources = new Map(
    sources.filter(({ type }) => type === 'esql').map(({ value }) => [esqlSourceRef(value), value])
  );
  const connectorIds = new Set(
    sources.filter(({ type }) => type === 'connector').map(({ value }) => value)
  );
  const connectors = new Map<string, Promise<ResolvedConnector>>();
  const seen = new Set(skip);
  const evidence: Evidence[] = [];
  const errors: ResearchError[] = [];
  const add = (items: Evidence[]) => {
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        evidence.push(item);
      }
    }
  };

  const runEsql = async (source: string, query: string | undefined) => {
    const esqlQuery = esqlSources.get(source);
    if (esqlQuery === undefined) {
      throw new Error('There is no such source.');
    }
    if (!query?.trim()) {
      throw new Error('A search of an ES|QL source needs a query.');
    }
    const indices = indicesOfEsqlSource(esqlQuery);
    if (indices.length === 0) {
      throw new Error('The ES|QL source has no FROM clause to search.');
    }
    const response = await searchIndices({ esClient, indices, query, size, abortSignal });
    return response.hits.hits.map((hit) => {
      const uri = truncate(
        `index://${hit._index}/${encodeURIComponent(hit._id ?? '')}`,
        MAX_KI_REFERENCE_URI_LENGTH
      );
      return toEvidence(source, uri, hit._source ?? {});
    });
  };

  const runConnector = async ({
    source,
    sub_action: subAction,
    params: rawParams,
  }: ResearchSearch) => {
    const connectorId = source.slice(CONNECTOR_SOURCE_REF_PREFIX.length);
    if (!connectorIds.has(connectorId)) {
      throw new Error('There is no such source.');
    }
    if (!subAction) {
      throw new Error('A search of a connector source needs a sub_action.');
    }
    if (!connectors.has(connectorId)) {
      connectors.set(connectorId, resolveConnector(actionsClient, connectorId));
    }
    const connector = await (connectors.get(connectorId) as Promise<ResolvedConnector>);
    if (!connector.subActions.some(({ name }) => name === subAction)) {
      throw new Error(
        `Sub-action '${subAction}' is not one of the read-only sub-actions of this connector: ${
          connector.subActions.map(({ name }) => name).join(', ') || 'none'
        }.`
      );
    }
    const result = await actionsClient.execute({
      actionId: connectorId,
      params: { subAction, subActionParams: paramsOf(rawParams) },
      signal: abortSignal,
    });
    if (result.status === 'error') {
      throw new Error(result.message ?? result.serviceMessage ?? 'The sub-action failed.');
    }
    return resultsOf(result.data)
      .slice(0, size)
      .map((item) => toEvidence(source, connectorResultUri(connectorId, subAction, item), item));
  };

  for (const search of searches) {
    abortSignal?.throwIfAborted();
    try {
      if (search.source.startsWith(ESQL_SOURCE_REF_PREFIX)) {
        add(await runEsql(search.source, search.query));
      } else if (search.source.startsWith(CONNECTOR_SOURCE_REF_PREFIX)) {
        add(await runConnector(search));
      } else {
        throw new Error('There is no such source.');
      }
    } catch (error) {
      if (isAbort(error) || abortSignal?.aborted) {
        throw error;
      }
      logger.debug(() => `Research search of '${search.source}' failed: ${errorMessage(error)}`);
      errors.push({ source: search.source, message: errorMessage(error) });
    }
  }
  return { evidence, errors };
};
