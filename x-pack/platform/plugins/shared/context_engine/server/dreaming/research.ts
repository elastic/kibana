/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  ESQL_SOURCE_REF_PREFIX,
} from '../../common/step_types/research';
import { parseFromClause } from '../tasks/transform';
import { shortHash } from './ids';

/** The actions client methods research uses. */
export type ResearchActionsClient = Pick<ActionsClient, 'get' | 'getAll'>;

export interface ResearchSubAction {
  name: string;
  description: string;
  /** The parameters, one per line, as the model reads them. */
  params: string;
}

/** A source of an AI index as the research agent sees it. */
export interface ResearchSource {
  ref: string;
  type: AiIndexSource['type'];
  name: string;
  description: string;
  /** For an ES|QL source: the indices its `FROM` reads. */
  indices?: string[];
  /** For a connector source: its id, as the connector tool takes it. */
  connector_id?: string;
  /** For a connector source: the sub-actions research may run, all of which only read. */
  sub_actions?: ResearchSubAction[];
  /** For a connector source: how to use its sub-actions, from the connector type. */
  guidance?: string;
  /** Why the source cannot be searched; research skips it. */
  error?: string;
}

const MAX_GUIDANCE_LENGTH = 4000;
const MAX_PARAM_DESCRIPTION_LENGTH = 300;
const ID_HASH_LENGTH = 8;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const truncate = (text: string, length: number): string =>
  text.length <= length ? text : `${text.slice(0, length - 1)}…`;

export const esqlSourceRef = (query: string): string =>
  `${ESQL_SOURCE_REF_PREFIX}${shortHash(query).slice(0, ID_HASH_LENGTH)}`;

export const connectorSourceRef = (connectorId: string): string =>
  `${CONNECTOR_SOURCE_REF_PREFIX}${connectorId}`;

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

/** The sub-actions an agent may run on a connector: its tools enabled by `selectedActions`. */
const enabledToolActions = (spec: ConnectorSpec, selectedActions: SelectedActions) =>
  Object.entries(spec.actions).filter(
    ([name]) => isToolAction(spec, name) && isSelectedActionEnabled(name, selectedActions)
  );

/**
 * Whether an agent can only read through a connector: it has sub-actions an agent may run, and
 * every one of them only reads. Research runs unattended, so it only uses such connectors; one
 * that can write is made read-only by enabling only its read sub-actions on it.
 */
export const isReadOnlyConnector = (
  spec: ConnectorSpec | undefined,
  selectedActions: SelectedActions
): boolean => {
  if (!spec) {
    return false;
  }
  const actions = enabledToolActions(spec, selectedActions);
  return actions.length > 0 && actions.every(([, action]) => action.scope === 'read');
};

const selectedActionsOf = (connector: { config?: Record<string, unknown> }): SelectedActions =>
  connector.config?.selectedActions as SelectedActions;

/** The ids of the connectors the caller can see that an agent can only read through. */
export const readOnlyConnectorIds = async (
  actionsClient: Pick<ActionsClient, 'getAll'>
): Promise<string[]> =>
  (await actionsClient.getAll())
    .filter((connector) =>
      isReadOnlyConnector(getConnectorSpec(connector.actionTypeId), selectedActionsOf(connector))
    )
    .map(({ id }) => id);

const describeEsqlSource = (query: string): ResearchSource => {
  const indices = indicesOfEsqlSource(query);
  return {
    ref: esqlSourceRef(query),
    type: 'esql',
    name: query,
    description: `Documents in ${indices.join(', ') || 'no index'}`,
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
    const connector = await actionsClient.get({ id: connectorId });
    const spec = getConnectorSpec(connector.actionTypeId);
    const selectedActions = selectedActionsOf(connector);
    const base = {
      ref,
      type: 'connector' as const,
      name: connector.name,
      description: spec?.metadata.description ?? connector.name,
      connector_id: connector.id,
    };
    if (!spec) {
      return {
        ...base,
        error: `Connector type '${connector.actionTypeId}' has no sub-actions an agent can run.`,
      };
    }
    if (!isReadOnlyConnector(spec, selectedActions)) {
      return {
        ...base,
        error:
          'The connector is not read-only: research only uses connectors whose enabled sub-actions all only read. Enable only its read sub-actions to use it.',
      };
    }
    return {
      ...base,
      sub_actions: enabledToolActions(spec, selectedActions).map(([name, action]) => ({
        name,
        description: action.description ?? name,
        params: describeParams(action.input),
      })),
      ...(spec.skill && { guidance: truncate(spec.skill, MAX_GUIDANCE_LENGTH) }),
    };
  } catch (error) {
    return {
      ref,
      type: 'connector',
      name: connectorId,
      description: connectorId,
      connector_id: connectorId,
      error: `The connector cannot be read: ${errorMessage(error)}`,
    };
  }
};

/** The research source catalog of an AI index: each source, and how research can use it. */
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
