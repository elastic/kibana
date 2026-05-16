/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionEngineModel,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListItemDto,
  WorkflowListDto,
  WorkflowListItemDto,
} from '@kbn/workflows';
import type { WorkflowsManagementApiContract } from '../types';
import { apiPrivileges } from '../../common/features';
import {
  SML_SYSTEM_WORKFLOW_TAG,
  systemWorkflowCancelExecutionPath,
  systemWorkflowExecutionsPath,
  systemWorkflowItemPath,
  systemWorkflowResumeExecutionPath,
  systemWorkflowStartPath,
  systemWorkflowsInstallPath,
  systemWorkflowsListPath,
  type SmlSystemWorkflowProgress,
} from '../../common/constants';
import type { AgentContextLayerPluginStart, AgentContextLayerStartDependencies } from '../types';
import { installSystemWorkflows } from '../system_workflows/install_system_workflows';
import { computeSmlWorkflowProgress } from '../system_workflows/compute_progress';

const SYSTEM_WORKFLOW_MANAGE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.manageSystemWorkflows] },
};

const ID_PARAM = schema.object({
  id: schema.string({ minLength: 1, meta: { description: 'Workflow id.' } }),
});

const ID_AND_EXECUTION_PARAMS = schema.object({
  id: schema.string({ minLength: 1 }),
  executionId: schema.string({ minLength: 1 }),
});

const ensureSystemTaggedWorkflow = (workflow: WorkflowDetailDto): void => {
  const definitionTags = workflow.definition?.tags;
  const isSystemTagged =
    Array.isArray(definitionTags) && definitionTags.includes(SML_SYSTEM_WORKFLOW_TAG);
  if (!isSystemTagged) {
    throw new ApiError(
      400,
      `Workflow '${workflow.id}' is not an SML system workflow (must be tagged '${SML_SYSTEM_WORKFLOW_TAG}').`
    );
  }
};

class ApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

/**
 * Registers the HTTP routes powering the ACL management page.
 *
 * Every route is gated by the `agentContextLayer:manageSystemWorkflows`
 * sub-feature privilege and proxies to the workflows management server
 * contract. The list route scopes to workflows tagged
 * {@link SML_SYSTEM_WORKFLOW_TAG}; per-id routes verify the resolved
 * workflow carries the same tag before operating on it.
 */
export const registerSystemWorkflowsRoutes = ({
  router,
  coreSetup,
  logger,
  getWorkflowsManagementApi,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>;
  logger: Logger;
  getWorkflowsManagementApi: () => WorkflowsManagementApiContract;
}) => {
  const resolveSpaceId = async (request: KibanaRequest): Promise<string> => {
    const [, startDeps] = await coreSetup.getStartServices();
    const spaces: SpacesPluginStart | undefined = startDeps.spaces;
    return spaces?.spacesService?.getSpaceId(request) ?? 'default';
  };

  router.get(
    {
      path: systemWorkflowsListPath,
      security: SYSTEM_WORKFLOW_MANAGE_SECURITY,
      validate: {
        query: schema.object({
          size: schema.number({ defaultValue: 50, min: 1, max: 500 }),
          page: schema.number({ defaultValue: 1, min: 1 }),
          query: schema.maybe(schema.string()),
          enabled: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (_context, request, response) => {
      try {
        const spaceId = await resolveSpaceId(request);
        const api = getWorkflowsManagementApi();
        const list: WorkflowListDto = await api.getWorkflows(
          {
            size: request.query.size,
            page: request.query.page,
            query: request.query.query,
            tags: [SML_SYSTEM_WORKFLOW_TAG],
            enabled:
              typeof request.query.enabled === 'boolean' ? [request.query.enabled] : undefined,
          },
          spaceId,
          { includeExecutionHistory: true }
        );
        const enrichedResults = await Promise.all(
          list.results.map((item) => enrichWithProgress({ api, item, spaceId, logger }))
        );
        return response.ok({
          body: { ...list, results: enrichedResults },
        });
      } catch (error) {
        return handleError(response, logger, error, 'list-system-workflows');
      }
    }
  );

  router.post(
    {
      path: systemWorkflowsInstallPath,
      security: SYSTEM_WORKFLOW_MANAGE_SECURITY,
      validate: false,
    },
    async (_context, request, response) => {
      try {
        const spaceId = await resolveSpaceId(request);
        const api = getWorkflowsManagementApi();
        const result = await installSystemWorkflows({
          workflowsManagementApi: api,
          request,
          spaceId,
          logger,
        });
        return response.ok({ body: result });
      } catch (error) {
        return handleError(response, logger, error, 'install-system-workflows');
      }
    }
  );

  router.get(
    {
      path: systemWorkflowItemPath,
      security: SYSTEM_WORKFLOW_MANAGE_SECURITY,
      validate: { params: ID_PARAM },
    },
    async (_context, request, response) => {
      try {
        const spaceId = await resolveSpaceId(request);
        const api = getWorkflowsManagementApi();
        const workflow = await api.getWorkflow(request.params.id, spaceId);
        if (!workflow) {
          return response.notFound({ body: { message: 'Workflow not found.' } });
        }
        ensureSystemTaggedWorkflow(workflow);
        return response.ok({ body: workflow });
      } catch (error) {
        return handleError(response, logger, error, 'get-system-workflow');
      }
    }
  );

  router.post(
    {
      path: systemWorkflowStartPath,
      security: SYSTEM_WORKFLOW_MANAGE_SECURITY,
      validate: {
        params: ID_PARAM,
        body: schema.object({
          inputs: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
        }),
      },
    },
    async (_context, request, response) => {
      try {
        const spaceId = await resolveSpaceId(request);
        const api = getWorkflowsManagementApi();
        const workflow = await api.getWorkflow(request.params.id, spaceId);
        if (!workflow) {
          return response.notFound({ body: { message: 'Workflow not found.' } });
        }
        ensureSystemTaggedWorkflow(workflow);
        const executionId = await api.runWorkflow(
          toEngineModel(workflow),
          spaceId,
          request.body.inputs,
          request,
          'agent_context_layer:management_page'
        );
        return response.ok({ body: { executionId } });
      } catch (error) {
        return handleError(response, logger, error, 'start-system-workflow');
      }
    }
  );

  router.post(
    {
      path: systemWorkflowCancelExecutionPath,
      security: SYSTEM_WORKFLOW_MANAGE_SECURITY,
      validate: { params: ID_AND_EXECUTION_PARAMS },
    },
    async (_context, request, response) => {
      try {
        const spaceId = await resolveSpaceId(request);
        const api = getWorkflowsManagementApi();
        const workflow = await api.getWorkflow(request.params.id, spaceId);
        if (!workflow) {
          return response.notFound({ body: { message: 'Workflow not found.' } });
        }
        ensureSystemTaggedWorkflow(workflow);
        await api.cancelWorkflowExecution(request.params.executionId, spaceId);
        return response.ok({ body: { ok: true } });
      } catch (error) {
        return handleError(response, logger, error, 'cancel-system-workflow-execution');
      }
    }
  );

  router.post(
    {
      path: systemWorkflowResumeExecutionPath,
      security: SYSTEM_WORKFLOW_MANAGE_SECURITY,
      validate: {
        params: ID_AND_EXECUTION_PARAMS,
        body: schema.object({
          inputs: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
        }),
      },
    },
    async (_context, request, response) => {
      try {
        const spaceId = await resolveSpaceId(request);
        const api = getWorkflowsManagementApi();
        const workflow = await api.getWorkflow(request.params.id, spaceId);
        if (!workflow) {
          return response.notFound({ body: { message: 'Workflow not found.' } });
        }
        ensureSystemTaggedWorkflow(workflow);
        await api.resumeWorkflowExecution(
          request.params.executionId,
          spaceId,
          request.body.inputs,
          request
        );
        return response.ok({ body: { ok: true } });
      } catch (error) {
        return handleError(response, logger, error, 'resume-system-workflow-execution');
      }
    }
  );

  router.get(
    {
      path: systemWorkflowExecutionsPath,
      security: SYSTEM_WORKFLOW_MANAGE_SECURITY,
      validate: {
        params: ID_PARAM,
        query: schema.object({
          size: schema.number({ defaultValue: 20, min: 1, max: 200 }),
          page: schema.number({ defaultValue: 1, min: 1 }),
        }),
      },
    },
    async (_context, request, response) => {
      try {
        const spaceId = await resolveSpaceId(request);
        const api = getWorkflowsManagementApi();
        const workflow = await api.getWorkflow(request.params.id, spaceId);
        if (!workflow) {
          return response.notFound({ body: { message: 'Workflow not found.' } });
        }
        ensureSystemTaggedWorkflow(workflow);
        const executions = await api.getWorkflowExecutions(
          {
            workflowId: request.params.id,
            size: request.query.size,
            page: request.query.page,
          },
          spaceId
        );
        return response.ok({ body: executions });
      } catch (error) {
        return handleError(response, logger, error, 'list-system-workflow-executions');
      }
    }
  );
};

const toEngineModel = (workflow: WorkflowDetailDto): WorkflowExecutionEngineModel => ({
  id: workflow.id,
  name: workflow.name,
  enabled: workflow.enabled,
  definition: workflow.definition!,
  yaml: workflow.yaml,
});

/**
 * Wrapper around `WorkflowListItemDto` we ship to the ACL admin page. We
 * extend, not replace, the upstream dto so the React table keeps using its
 * existing fields (`name`, `enabled`, `history`, ...). Extra fields are
 * silently dropped if the client doesn't know about them.
 */
type SmlSystemWorkflowListItem = WorkflowListItemDto & {
  /**
   * Best-effort progress summary for the latest execution. Populated only
   * while the most recent history entry is still running (or pending). The
   * client uses it to render a richer status column for the two bundled
   * workflows; absence means "no live progress to display".
   */
  progress?: SmlSystemWorkflowProgress;
};

/**
 * Active history-entry statuses. We only enrich progress for these because
 * computing it requires an extra `getWorkflowExecution` round trip per row —
 * there's no value in paying that cost for completed/failed runs whose final
 * state is already visible in the "Last run" column.
 */
const ACTIVE_HISTORY_STATUSES = new Set(['running', 'pending', 'waiting_for_input', 'waiting']);

/**
 * Project a `WorkflowExecutionListItemDto` (returned by
 * `getWorkflowExecutions`) onto the smaller `WorkflowExecutionHistoryModel`
 * shape the table's "Last run" column understands. We only need the fields
 * the upstream `getRecentExecutionsForWorkflows` would have populated.
 */
const toHistoryEntry = (
  execution: WorkflowExecutionListItemDto
): WorkflowExecutionHistoryModel => ({
  id: execution.id,
  workflowId: execution.workflowId,
  workflowName: execution.workflowName,
  status: execution.status,
  startedAt: execution.startedAt,
  finishedAt: execution.finishedAt,
  duration: execution.duration ?? null,
});

/**
 * Hydrate a list item with the *truly* latest execution and a `progress`
 * summary when that execution is still in flight.
 *
 * Why we re-fetch instead of trusting `item.history[0]`: the upstream
 * `getWorkflows({ includeExecutionHistory: true })` populates history via a
 * `top_hits` aggregation sorted by `finishedAt desc`. Running executions
 * have no `finishedAt`, so they sort last — the array ends up showing the
 * most-recently-finished run while a brand-new run is invisibly in
 * progress. We call `getWorkflowExecutions({ size: 1 })` (default sort
 * `createdAt desc`) to surface the actual newest execution and overwrite
 * `history[0]` so the "Last run" column reflects reality.
 *
 * Returns the row unchanged (no enrichment) when:
 *   - The workflow has never been executed.
 *   - The latest execution is already in a terminal state.
 *   - Lookups fail (permissions, transient ES hiccup, ...). Progress and
 *     the override are purely informational, so we swallow errors rather
 *     than failing the whole list response.
 *
 * `getWorkflowExecution` is called with `includeInput`/`includeOutput`
 * because the workflows API strips both by default — without them the
 * crawl can't derive `total` (from `list_indices.output`) or
 * `currentIndex` (from the in-flight `workflow.execute` step's resolved
 * `inputs.indexPattern`).
 */
const enrichWithProgress = async ({
  api,
  item,
  spaceId,
  logger,
}: {
  api: WorkflowsManagementApiContract;
  item: WorkflowListItemDto;
  spaceId: string;
  logger: Logger;
}): Promise<SmlSystemWorkflowListItem> => {
  let latest: WorkflowExecutionHistoryModel | undefined;
  try {
    const latestList = await api.getWorkflowExecutions(
      { workflowId: item.id, size: 1, page: 1 },
      spaceId
    );
    const newest = latestList.results[0];
    if (newest) latest = toHistoryEntry(newest);
  } catch (error) {
    logger.debug(
      `Agent Context Layer failed to fetch latest execution for '${item.id}': ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Fall back to the upstream-provided history when re-fetch failed, so
  // rows still render something meaningful instead of going blank.
  const baseItem: WorkflowListItemDto = latest
    ? { ...item, history: [latest] }
    : item;
  const activeLatest = latest ?? item.history?.[0];
  if (!activeLatest || !ACTIVE_HISTORY_STATUSES.has(activeLatest.status)) {
    return baseItem;
  }
  try {
    const execution = await api.getWorkflowExecution(activeLatest.id, spaceId, {
      includeInput: true,
      includeOutput: true,
    });
    if (!execution) return baseItem;
    const progress = computeSmlWorkflowProgress({ execution });
    if (!progress) return baseItem;
    return { ...baseItem, progress };
  } catch (error) {
    logger.debug(
      `Agent Context Layer progress enrichment skipped for '${item.id}' (execution '${activeLatest.id}'): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return baseItem;
  }
};

const handleError = (
  response: Parameters<Parameters<IRouter['post']>[1]>[2],
  logger: Logger,
  error: unknown,
  op: string
) => {
  if (error instanceof ApiError) {
    return response.customError({
      statusCode: error.statusCode,
      body: { message: error.message },
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Agent Context Layer ${op} failed: ${message}`);
  return response.customError({ statusCode: 500, body: { message } });
};
