/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  connectorsSpecs,
  filterActionsBySelection,
  getConnectorSpec,
  resolveActionScope,
} from '@kbn/connector-specs';
import type {
  ConnectorSpecActionDetail,
  ConnectorSpecActionSummary,
  ConnectorSpecDetail,
  ConnectorSpecSummary,
} from '@kbn/actions-plugin/common';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec, SelectedActions } from '@kbn/connector-specs';
import type { ZodType } from '@kbn/zod/v4';

/** Spec-derived fields Agent Builder reads, taken from what the actions plugin serves. */
export type ConnectorSpecInfo = Pick<
  ConnectorSpecSummary,
  'id' | 'displayName' | 'description' | 'isTechnicalPreview' | 'authTypeIds' | 'actions'
>;

export type ConnectorSpecDetailInfo = Pick<
  ConnectorSpecDetail,
  'id' | 'displayName' | 'description' | 'isTechnicalPreview' | 'authTypeIds' | 'skill' | 'actions'
>;

/** Read-only access to connector spec summaries; needs no per-request state. */
export interface ConnectorSpecSummaryProvider {
  /** Summary of a connector type, or undefined when the type has no spec. */
  getSpec(connectorTypeId: string): ConnectorSpecInfo | undefined;
  /** Summaries of every spec-backed connector type. */
  listSpecs(): ConnectorSpecInfo[];
}

export interface ConnectorSpecProvider extends ConnectorSpecSummaryProvider {
  /** Summary plus skill text and per-action input schemas, or undefined when there is no spec. */
  getSpecDetail(connectorTypeId: string): Promise<ConnectorSpecDetailInfo | undefined>;
}

/** Same options the actions plugin uses when serializing action inputs. */
const toInputJsonSchema = (input: ZodType): Record<string, unknown> =>
  z.toJSONSchema(input, { unrepresentable: 'any', io: 'input' }) as Record<string, unknown>;

/** Provider backed by the in-tree `@kbn/connector-specs` package (current behavior). */
export const createPackageConnectorSpecProvider = (): ConnectorSpecProvider => {
  const toSummary = (spec: ConnectorSpec): ConnectorSpecInfo => ({
    id: spec.metadata.id,
    displayName: spec.metadata.displayName,
    description: spec.metadata.description,
    isTechnicalPreview: spec.metadata.isTechnicalPreview ?? false,
    authTypeIds: (spec.auth?.types ?? []).map((authType) =>
      typeof authType === 'string' ? authType : authType.type
    ),
    actions: Object.entries(spec.actions).map(([name, def]) => ({
      name,
      ...(def.description !== undefined ? { description: def.description } : {}),
      isTool: Boolean(def.isTool),
      scope: resolveActionScope(def),
    })),
  });

  const toDetail = (spec: ConnectorSpec): ConnectorSpecDetailInfo => {
    const { actions: summaryActions, ...summary } = toSummary(spec);
    return {
      ...summary,
      ...(spec.skill !== undefined ? { skill: spec.skill } : {}),
      actions: summaryActions.map((action) => ({
        ...action,
        inputSchema: toInputJsonSchema(spec.actions[action.name].input),
      })),
    };
  };

  return {
    getSpec: (connectorTypeId) => {
      const spec = getConnectorSpec(connectorTypeId);
      return spec && toSummary(spec);
    },
    getSpecDetail: async (connectorTypeId) => {
      const spec = getConnectorSpec(connectorTypeId);
      return spec && toDetail(spec);
    },
    listSpecs: () => Object.values(connectorsSpecs).map(toSummary),
  };
};

/** The slice of the actions plugin start contract that serves summaries without a request. */
export interface SpecActionsStart {
  listTypes(
    featureId?: string,
    options?: { includeSpecSummary?: boolean; typeId?: string }
  ): Array<{ specSummary?: ConnectorSpecInfo }>;
}

/** The slice of `ActionsClient` that serves each action's input schema and the skill text. */
export interface SpecActionsClient {
  getConnectorSpec(options: {
    id: string;
  }): Promise<{ skill?: string; actions: ConnectorSpecActionDetail[] }>;
}

/** Summary provider backed by the actions plugin; needs no request, so crawls can use it. */
const createActionsStartConnectorSpecSummaryProvider = (
  actionsStart: SpecActionsStart
): ConnectorSpecSummaryProvider => ({
  getSpec: (connectorTypeId) =>
    actionsStart.listTypes(undefined, { includeSpecSummary: true, typeId: connectorTypeId })[0]
      ?.specSummary,
  listSpecs: () =>
    actionsStart
      .listTypes(undefined, { includeSpecSummary: true })
      .flatMap(({ specSummary }) => (specSummary ? [specSummary] : [])),
});

/** Provider backed by the actions plugin, so catalog types resolve like in-tree ones. */
export const createActionsConnectorSpecProvider = ({
  actionsStart,
  actionsClient,
}: {
  actionsStart: SpecActionsStart;
  actionsClient: SpecActionsClient;
}): ConnectorSpecProvider => {
  const summaryProvider = createActionsStartConnectorSpecSummaryProvider(actionsStart);
  return {
    ...summaryProvider,
    getSpecDetail: async (connectorTypeId) => {
      const summary = summaryProvider.getSpec(connectorTypeId);
      if (!summary) return undefined;

      const { skill, actions } = await actionsClient.getConnectorSpec({ id: connectorTypeId });
      const inputSchemas = new Map(actions.map(({ name, inputSchema }) => [name, inputSchema]));
      return {
        ...summary,
        ...(skill !== undefined ? { skill } : {}),
        actions: summary.actions.map((action) => ({
          ...action,
          inputSchema: inputSchemas.get(action.name) ?? {},
        })),
      };
    },
  };
};

/**
 * Single switch for where Agent Builder reads connector specs from. Stays on the in-tree
 * package until the actions-backed provider is verified to return the same data. Without an
 * `actionsClient` (no request) it returns the summary-only provider.
 */
export function createConnectorSpecProvider(options: {
  actionsStart: SpecActionsStart;
  actionsClient: SpecActionsClient;
  source?: 'package' | 'actions';
}): ConnectorSpecProvider;
export function createConnectorSpecProvider(options: {
  actionsStart: SpecActionsStart;
  source?: 'package' | 'actions';
}): ConnectorSpecSummaryProvider;
export function createConnectorSpecProvider({
  actionsStart,
  actionsClient,
  source = 'package',
}: {
  actionsStart: SpecActionsStart;
  actionsClient?: SpecActionsClient;
  source?: 'package' | 'actions';
}): ConnectorSpecProvider | ConnectorSpecSummaryProvider {
  if (source !== 'actions') return createPackageConnectorSpecProvider();
  return actionsClient
    ? createActionsConnectorSpecProvider({ actionsStart, actionsClient })
    : createActionsStartConnectorSpecSummaryProvider(actionsStart);
}

/**
 * Actions an agent can call (`isTool`), narrowed to the instance's `selectedActions` when set.
 * Pass `requireDescription` to drop actions without a description.
 */
export const filterSpecActionsBySelection = <T extends ConnectorSpecActionSummary>(
  actions: T[],
  selectedActions: SelectedActions,
  options?: { requireDescription?: boolean }
): T[] =>
  filterActionsBySelection(
    Object.fromEntries(actions.map((action) => [action.name, action])),
    selectedActions,
    options
  ).map(([, action]) => action);
