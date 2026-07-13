/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { tool } from '@langchain/core/tools';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import type { ToolCall } from '@kbn/agent-builder-genai-utils/langchain';
import { getIndexFields, indexExplorer } from '@kbn/agent-builder-genai-utils';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { PanelFailure } from '../../core/utils';
import { getErrorMessage } from '../../core/utils';
import type { ResolvePanelContent } from '../../core/operations/panels';
import {
  executeOperationHandler,
  operationDefinitions,
  prepareOperationExecution,
  type DashboardOperation,
} from '../../core/operations/registry';
import { runCritique } from '../critique';

/* ---------- Public types ---------- */

export interface ToolMessage {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DispatchResult {
  /** New dashboard payload if the tool mutated state; undefined otherwise. */
  dashboard?: DashboardAttachmentData;
  /** Per-panel soft failures produced by this dispatch (resolution errors etc). */
  failures?: PanelFailure[];
  /** Terminal failures that this successful dispatch explicitly recovered. */
  resolvedFailureIds?: string[];
  message: ToolMessage;
}

export interface DispatchDeps {
  logger: Logger;
  /** Inline panel resolver; required for panel-request creating/editing tools. */
  resolvePanelContent?: ResolvePanelContent;
  /** For the explore_data lookup tool; exploration fails gracefully without them. */
  esClient?: IScopedClusterClient;
  model?: ScopedModel;
}

export interface DashboardToolState {
  dashboard: DashboardAttachmentData;
  /** The original request that started this orchestration run. */
  request?: string;
}

/**
 * One bound tool: its name, the LLM-facing description, the input schema, and
 * how it executes. Operation-backed tools carry `operationType` and are run by
 * the batch dispatcher (which pre-resolves panel content across all calls of a
 * turn in parallel); self-contained lookup tools carry `execute`.
 *
 * The langchain wrapping (`buildBoundTools`) only uses name + description +
 * schema so the model can produce well-typed tool calls; its tool body is
 * intentionally never invoked (see `NEVER_CALLED`).
 */
export interface DashboardGenToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  /** True when execution produces a new dashboard payload; false for read-only lookups. */
  mutatesDashboard: boolean;
  /** Present for operation-backed tools; the batch dispatcher builds and executes the op. */
  operationType?: DashboardOperation['operation'];
  /** Present for self-contained lookup tools. */
  execute?: (
    args: Record<string, unknown>,
    state: DashboardToolState,
    deps: DispatchDeps
  ) => Promise<DispatchResult>;
}

/* ---------- LLM-facing tool descriptions ---------- */

const TOOL_DESCRIPTIONS: Record<string, string> = {
  set_metadata:
    'Set the dashboard title and/or description. Only set time_range when the user explicitly requested a specific time window — a data-aware default is applied automatically otherwise.',
  add_panels:
    'Add panels to the dashboard. Use source: "request" to create a visualization from a natural-language query (pick the engine with "renderer"; defaults to Lens), or source: "config" to pass an already-resolved config by value. Panels can target an existing section via sectionId.',
  edit_panels:
    'Edit existing panels in place by panelId. Supports ES|QL-backed Lens and Vega visualization panels (source: "request", which keep their existing renderer) and markdown panels (source: "config", type: "markdown"). By default a Lens edit KEEPS the panel\'s existing ES|QL query exactly as is (visual restyling only); set change_data: true when the edit should change what data is shown, or pass new_esql with a validated query. DSL, form-based, and other non-ES|QL visualization panels are not supported for direct editing and should be recreated as new ES|QL-based panels instead.',
  update_panel_layouts:
    'Update panel grid positions/sizes and/or move panels between sections (sectionId; null promotes to top level) without changing panel content.',
  add_section:
    'Add a collapsible section to the dashboard, optionally creating inline panels inside it (panel grids are section-relative).',
  remove_section:
    'Remove a section by id. panelAction decides whether its panels are promoted to the top level or deleted.',
  remove_panels: 'Remove panels from the dashboard by id.',
  add_controls:
    'Add controls (interactive filters pinned above the dashboard): options_list_control for categorical fields, range_slider_control for numeric fields, time_slider_control for time sub-range filtering (at most one per dashboard).',
  remove_controls: 'Remove controls by id (ids are listed in the dashboard state controls[]).',
};

/* ---------- Registry ---------- */

/**
 * Wrap one operation definition as a bound tool. The tool name is the
 * operation discriminator; the tool schema is the operation schema without
 * the discriminator (the name already conveys it). Execution happens in the
 * batch dispatcher, which reconstructs the full operations and pre-resolves
 * panel content across ALL of a turn's calls in one parallel batch.
 */
const buildToolDefinition = (
  definition: (typeof operationDefinitions)[number]
): DashboardGenToolDefinition => {
  const operationType = definition.schema.shape.operation.value as DashboardOperation['operation'];
  const argsSchema = (definition.schema as z.ZodObject<z.ZodRawShape>).omit({ operation: true });

  return {
    name: operationType,
    description: TOOL_DESCRIPTIONS[operationType] ?? operationType,
    schema: argsSchema,
    mutatesDashboard: true,
    operationType,
  };
};

/* ---------- Lookup tools ---------- */

/** Field-list cap keeping the tool result within a sane token budget. */
const MAX_EXPLORED_FIELDS = 500;

/**
 * Read-only data discovery: resolve the best-matching index / alias / data
 * stream for the dashboard's subject once, with its fields, so the agent can
 * plan every panel against one shared target instead of each panel
 * rediscovering an index during ES|QL generation.
 */
const exploreDataTool: DashboardGenToolDefinition = {
  name: 'explore_data',
  description:
    'Discover the target index, alias, or data stream for the dashboard and list its fields (name + type). Call it at most ONCE, and only when the request/context does not already name the index and fields. Reuse the result for every panel.',
  schema: z.object({
    query: z
      .string()
      .max(2048)
      .describe(
        'What the dashboard is about — used to select the best matching index, alias, or data stream.'
      ),
    index_pattern: z
      .string()
      .max(256)
      .optional()
      .describe('(optional) Narrow discovery to sources matching this pattern (e.g. "metrics-*").'),
  }),
  mutatesDashboard: false,
  execute: async (args, _state, deps) => {
    const { query, index_pattern: indexPattern } = args as {
      query: string;
      index_pattern?: string;
    };
    if (!deps.esClient || !deps.model) {
      return {
        message: { success: false, error: 'Data exploration is not available in this context.' },
      };
    }

    try {
      const { resources } = await indexExplorer({
        nlQuery: query,
        ...(indexPattern ? { indexPattern } : {}),
        limit: 1,
        esClient: deps.esClient.asCurrentUser,
        model: deps.model,
        logger: deps.logger,
      });

      const [target] = resources;
      if (!target) {
        return {
          message: {
            success: false,
            error: 'No matching index, alias, or data stream found. Try a broader index_pattern.',
          },
        };
      }

      const fieldsByTarget = await getIndexFields({
        indices: [target.name],
        esClient: deps.esClient.asCurrentUser,
      });
      const fields = (fieldsByTarget[target.name]?.fields ?? []).map(({ path, type }) => ({
        path,
        type,
      }));

      return {
        message: {
          success: true,
          data: {
            target: target.name,
            type: target.type,
            fields: fields.slice(0, MAX_EXPLORED_FIELDS),
            ...(fields.length > MAX_EXPLORED_FIELDS
              ? { omitted_field_count: fields.length - MAX_EXPLORED_FIELDS }
              : {}),
          },
        },
      };
    } catch (error) {
      return { message: { success: false, error: getErrorMessage(error) } };
    }
  },
};

const critiqueDashboardTool: DashboardGenToolDefinition = {
  name: 'critique_dashboard',
  description:
    'Critique the full current dashboard before prettifying, reviewing, or auditing it. Returns read-only, actionable findings; it never changes the dashboard. Call it only for an existing dashboard and at most once.',
  schema: z.object({}),
  mutatesDashboard: false,
  execute: async (_args, state, deps) => {
    if (!deps.model || !state.request) {
      return {
        message: { success: false, error: 'Dashboard critique is not available in this context.' },
      };
    }

    try {
      const findings = await runCritique({
        model: deps.model,
        request: state.request,
        dashboard: state.dashboard,
      });
      return { message: { success: true, data: { findings } } };
    } catch (error) {
      return { message: { success: false, error: getErrorMessage(error) } };
    }
  },
};

export const dashboardGenTools: ReadonlyArray<DashboardGenToolDefinition> = [
  ...operationDefinitions.map(buildToolDefinition),
  exploreDataTool,
  critiqueDashboardTool,
];

const allToolsByName: ReadonlyMap<string, DashboardGenToolDefinition> = new Map(
  dashboardGenTools.map((t) => [t.name, t])
);

/* ---------- Derived helpers ---------- */

export const isEditToolName = (name: string): boolean =>
  allToolsByName.get(name)?.mutatesDashboard === true;

export const getDashboardGenTools = ({
  includeCritique,
}: {
  includeCritique: boolean;
}): ReadonlyArray<DashboardGenToolDefinition> =>
  includeCritique
    ? dashboardGenTools
    : dashboardGenTools.filter(({ name }) => name !== critiqueDashboardTool.name);

const NEVER_CALLED = (): never => {
  throw new Error(
    'Bound dashboard tools are not directly invocable. Dispatch happens inside the graph node.'
  );
};

/**
 * Builds the langchain `StructuredTool[]` array used for `model.bindTools()`.
 * The tool bodies are stubs — actual execution goes through `dispatchToolCall`,
 * which has access to the dependencies that langchain doesn't.
 */
export const buildBoundTools = (
  definitions: ReadonlyArray<DashboardGenToolDefinition>
): StructuredToolInterface[] =>
  definitions.map((t) =>
    tool(NEVER_CALLED, {
      name: t.name,
      description: t.description,
      schema: t.schema,
    })
  );

interface ParsedCall {
  definition?: DashboardGenToolDefinition;
  args?: Record<string, unknown>;
  parseError?: string;
}

const parseCall = (
  call: ToolCall,
  toolsByName: ReadonlyMap<string, DashboardGenToolDefinition>
): ParsedCall => {
  const definition = toolsByName.get(call.toolName);
  if (!definition) {
    return { parseError: `Unknown tool: ${call.toolName}` };
  }
  const parsed = definition.schema.safeParse(call.args);
  if (!parsed.success) {
    return {
      definition,
      parseError: `Invalid arguments for ${call.toolName}: ${parsed.error.message}`,
    };
  }
  return { definition, args: parsed.data as Record<string, unknown> };
};

const getRecoveryFailureIds = (operation: DashboardOperation): string[] => {
  if (
    operation.operation !== 'add_panels' &&
    operation.operation !== 'add_section' &&
    operation.operation !== 'edit_panels'
  ) {
    return [];
  }

  return (operation.panels ?? []).flatMap((panel) =>
    panel.source === 'request' && panel.resolvesFailureId ? [panel.resolvesFailureId] : []
  );
};

/**
 * Dispatch all tool calls of one agent turn.
 *
 * Panel content for every operation in the turn is resolved up front in ONE
 * parallel batch (`prepareOperationExecution` over the whole operation list —
 * the same cross-operation batching the old operations[] contract had), then
 * the operations are applied sequentially in call order so each call sees the
 * previous call's payload. A failing call never affects the others: its
 * handler runs on a clone and its error becomes that call's tool message.
 */
export const dispatchToolCalls = async (
  state: DashboardToolState,
  calls: ToolCall[],
  deps: DispatchDeps,
  definitions: ReadonlyArray<DashboardGenToolDefinition> = getDashboardGenTools({
    includeCritique: false,
  })
): Promise<{ dashboard: DashboardAttachmentData; results: DispatchResult[] }> => {
  const toolsByName = new Map(definitions.map((definition) => [definition.name, definition]));
  const parsedCalls = calls.map((toolCall) => parseCall(toolCall, toolsByName));

  // Collect the turn's operations (in call order) for batched resolution.
  const operations: DashboardOperation[] = [];
  const operationIndexByCallIndex = new Map<number, number>();
  parsedCalls.forEach((parsed, callIndex) => {
    if (parsed.definition?.operationType && parsed.args && !parsed.parseError) {
      operationIndexByCallIndex.set(callIndex, operations.length);
      operations.push({
        operation: parsed.definition.operationType,
        ...parsed.args,
      } as DashboardOperation);
    }
  });

  const failures: PanelFailure[] = [];
  let context: Awaited<ReturnType<typeof prepareOperationExecution>> | undefined;
  let prepareError: string | undefined;
  if (operations.length > 0) {
    try {
      context = await prepareOperationExecution({
        operations,
        logger: deps.logger,
        resolvePanelContent: deps.resolvePanelContent,
        failures,
      });
    } catch (error) {
      prepareError = getErrorMessage(error);
    }
  }

  let dashboard = state.dashboard;
  const results: DispatchResult[] = [];

  for (const [callIndex, parsed] of parsedCalls.entries()) {
    if (parsed.parseError || !parsed.definition || !parsed.args) {
      results.push({ message: { success: false, error: parsed.parseError ?? 'Invalid call.' } });
      continue;
    }

    if (parsed.definition.execute) {
      results.push(
        await parsed.definition.execute(parsed.args, { dashboard, request: state.request }, deps)
      );
      continue;
    }

    if (prepareError !== undefined || !context) {
      results.push({ message: { success: false, error: prepareError ?? 'Invalid call.' } });
      continue;
    }

    const operationIndex = operationIndexByCallIndex.get(callIndex)!;
    const failuresBefore = failures.length;
    try {
      const nextDashboard = await executeOperationHandler({
        // Clone so a failing handler can never leave the threaded payload
        // partially mutated (same entry-time clone the old core performed).
        dashboardData: structuredClone(dashboard),
        operation: operations[operationIndex],
        operationIndex,
        context,
      });
      dashboard = nextDashboard;
      const operationFailures = failures.slice(failuresBefore);
      const failedRecoveryIds = new Set(
        operationFailures.flatMap(({ failureId }) => (failureId ? [failureId] : []))
      );
      results.push({
        dashboard: nextDashboard,
        failures: operationFailures,
        resolvedFailureIds: getRecoveryFailureIds(operations[operationIndex]).filter(
          (failureId) => !failedRecoveryIds.has(failureId)
        ),
        message: { success: true },
      });
    } catch (error) {
      results.push({
        failures: failures.slice(failuresBefore),
        resolvedFailureIds: [],
        message: { success: false, error: getErrorMessage(error) },
      });
    }
  }

  return { dashboard, results };
};

/** Single-call dispatch (used by tests and one-off callers); batch of one. */
export const dispatchToolCall = async (
  state: DashboardToolState,
  call: ToolCall,
  deps: DispatchDeps,
  definitions?: ReadonlyArray<DashboardGenToolDefinition>
): Promise<DispatchResult> => {
  const { results } = await dispatchToolCalls(state, [call], deps, definitions);
  return results[0];
};
