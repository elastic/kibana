/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  filterActionsBySelection,
  getConnectorSpec,
  type ActionDefinition,
  type SelectedActions,
} from '@kbn/connector-specs';
import { z, inlineRootJsonSchemaRef, type ZodType } from '@kbn/zod/v4';
import {
  MAX_CONNECTOR_FIELDS,
  MAX_CONNECTOR_SAMPLE_CHARS,
  MAX_CONNECTOR_SAMPLE_VALUES,
  MAX_TOP_VALUE_LENGTH,
  isSensitiveField,
} from '../../common/ontology';
import { shortHash } from '../dreaming/ids';
import { formatErrorMessage } from '../utils/format_es_error';

/** The part of the actions client ontology discovery reads connectors with. */
export type ConnectorActionsClient = Pick<
  Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>,
  'get' | 'execute'
>;

const MAX_PARAMETERS_LENGTH = 1500;
const MAX_SKILL_LENGTH = 4000;
const MAX_ERROR_LENGTH = 500;
const MAX_PATH_DEPTH = 6;
const MAX_ARRAY_ITEMS = 20;

/** A read sub-action of a connector, as the models see it. */
export interface ConnectorTool {
  name: string;
  description: string;
  parameters: string;
}

export interface ConnectorSourceInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  skill?: string;
  tools: ConnectorTool[];
  /** The read sub-actions an agent may call on this connector, by name. */
  readActions: ReadonlyMap<string, ActionDefinition>;
}

const parametersOf = (schema: ZodType | undefined): string => {
  if (!schema) {
    return 'none';
  }
  try {
    const json = JSON.stringify(
      inlineRootJsonSchemaRef(
        z.toJSONSchema(schema, { unrepresentable: 'any' }) as Record<string, unknown>
      )
    );
    return json.length > MAX_PARAMETERS_LENGTH ? `${json.slice(0, MAX_PARAMETERS_LENGTH)}…` : json;
  } catch {
    return 'unknown';
  }
};

/**
 * A connector source as ontology discovery reads it: its read sub-actions that are agent tools,
 * enabled on the connector. Write and destroy sub-actions are never called.
 */
export const resolveConnectorSource = async (
  actionsClient: ConnectorActionsClient,
  connectorId: string
): Promise<ConnectorSourceInfo> => {
  const connector = await actionsClient.get({ id: connectorId });
  const spec = getConnectorSpec(connector.actionTypeId);
  const selectedActions = (connector.config as { selectedActions?: SelectedActions } | undefined)
    ?.selectedActions;
  const readActions = new Map(
    (spec ? filterActionsBySelection(spec.actions, selectedActions) : []).filter(
      ([, action]) => action.scope === 'read'
    )
  );
  return {
    id: connectorId,
    name: connector.name,
    type: connector.actionTypeId,
    description: spec?.metadata.description ?? connector.actionTypeId,
    ...(spec?.skill && { skill: spec.skill.slice(0, MAX_SKILL_LENGTH) }),
    tools: [...readActions].map(([name, action]) => ({
      name,
      description: action.description ?? '',
      parameters: parametersOf(action.input as ZodType | undefined),
    })),
    readActions,
  };
};

/** A hash of a connector's type and read sub-actions: equal while what it can read is unchanged. */
export const connectorFingerprintOf = ({
  type,
  tools,
}: Pick<ConnectorSourceInfo, 'type' | 'tools'>) =>
  shortHash(type, ...tools.map(({ name, parameters }) => `${name}:${parameters}`).sort());

export type ConnectorCallResult = { ok: true; data: unknown } | { ok: false; error: string };

/** Runs one read sub-action of a connector source, refusing anything that is not one. */
export const callConnector = async (
  actionsClient: ConnectorActionsClient,
  source: Pick<ConnectorSourceInfo, 'id' | 'readActions'>,
  subAction: string,
  params: unknown
): Promise<ConnectorCallResult> => {
  const action = source.readActions.get(subAction);
  if (!action) {
    return { ok: false, error: `'${subAction}' is not a read sub-action of this connector` };
  }
  const parsed = (action.input as ZodType | undefined)?.safeParse(params ?? {});
  if (parsed && !parsed.success) {
    return {
      ok: false,
      error: `invalid params: ${parsed.error.message}`.slice(0, MAX_ERROR_LENGTH),
    };
  }
  try {
    const result = await actionsClient.execute({
      actionId: source.id,
      params: { subAction, subActionParams: (params ?? {}) as Record<string, unknown> },
    });
    if (result.status === 'error') {
      return {
        ok: false,
        error: `${result.message ?? 'the sub-action failed'}${
          result.serviceMessage ? `: ${result.serviceMessage}` : ''
        }`.slice(0, MAX_ERROR_LENGTH),
      };
    }
    return { ok: true, data: result.data };
  } catch (error) {
    return { ok: false, error: formatErrorMessage(error).slice(0, MAX_ERROR_LENGTH) };
  }
};

type JsonType = 'keyword' | 'long' | 'double' | 'boolean';

interface FieldStats {
  type: JsonType;
  values: Set<string | number>;
}

const jsonTypeOf = (value: unknown): JsonType | undefined => {
  if (typeof value === 'string') return 'keyword';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'double';
  if (typeof value === 'boolean') return 'boolean';
  return undefined;
};

const walk = (
  value: unknown,
  path: string,
  depth: number,
  fields: Map<string, FieldStats>
): void => {
  if (depth > MAX_PATH_DEPTH || value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    value.slice(0, MAX_ARRAY_ITEMS).forEach((item) => walk(item, path, depth + 1, fields));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      walk(child, path ? `${path}.${key}` : key, depth + 1, fields);
    }
    return;
  }
  const type = jsonTypeOf(value);
  if (!type || !path) {
    return;
  }
  const stats = fields.get(path) ?? { type, values: new Set<string | number>() };
  if (stats.type !== type) {
    const numeric = (candidate: JsonType) => candidate === 'long' || candidate === 'double';
    stats.type = numeric(stats.type) && numeric(type) ? 'double' : 'keyword';
  }
  if (
    (typeof value === 'string' && value.length <= MAX_TOP_VALUE_LENGTH) ||
    typeof value === 'number'
  ) {
    if (stats.values.size < MAX_CONNECTOR_SAMPLE_VALUES) {
      stats.values.add(value);
    }
  }
  fields.set(path, stats);
};

/**
 * The record fields of a connector's sample results, as `<sub-action>.<path>` with arrays flattened,
 * and the distinct values seen in each, left out for fields whose names look sensitive or when
 * value samples are off.
 */
export const connectorFieldsOf = (
  samples: ReadonlyArray<{ sub_action: string; data: unknown }>,
  valueSamples: boolean
) => {
  const fields = new Map<string, FieldStats>();
  for (const { sub_action: subAction, data } of samples) {
    const own = new Map<string, FieldStats>();
    walk(data, '', 0, own);
    own.forEach((stats, path) => {
      const name = `${subAction}.${path}`;
      const current = fields.get(name);
      if (!current) {
        fields.set(name, stats);
        return;
      }
      stats.values.forEach((value) => {
        if (current.values.size < MAX_CONNECTOR_SAMPLE_VALUES) current.values.add(value);
      });
    });
  }
  return [...fields]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, MAX_CONNECTOR_FIELDS)
    .map(([name, { type, values }]) => ({
      name,
      type,
      searchable: false,
      aggregatable: false,
      ...(valueSamples && !isSensitiveField(name) && values.size > 0
        ? { sample_values: [...values] }
        : {}),
    }));
};

const skeletonOf = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_PATH_DEPTH) return '…';
  if (Array.isArray(value)) return value.length > 0 ? [skeletonOf(value[0], depth + 1)] : [];
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        skeletonOf(child, depth + 1),
      ])
    );
  }
  return jsonTypeOf(value) ?? 'null';
};

/**
 * One sample result as the describing model reads it: the JSON itself, or with value samples off,
 * its shape with each value replaced by its type. Cut at {@link MAX_CONNECTOR_SAMPLE_CHARS}.
 */
export const renderSample = (data: unknown, valueSamples: boolean): string => {
  const text = JSON.stringify(valueSamples ? data : skeletonOf(data)) ?? 'null';
  return text.length > MAX_CONNECTOR_SAMPLE_CHARS
    ? `${text.slice(0, MAX_CONNECTOR_SAMPLE_CHARS)}…`
    : text;
};
