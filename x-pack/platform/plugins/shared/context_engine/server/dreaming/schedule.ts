/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import {
  CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_LUCID_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_LUCID_TRACE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { ContextEngineDreamingWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_DREAMING_INTERVAL,
  DEFAULT_LUCID_DREAMING_INTERVAL,
  DEFAULT_RELATIONSHIP_DREAMING_INTERVAL,
  MIN_DREAMING_INTERVAL_MINUTES,
  MIN_RELATIONSHIP_DREAMING_INTERVAL_MINUTES,
  dreamingBuildsAnything,
  dreamingTypesOf,
  isLucidDreaming,
  isRelationshipDreaming,
  isSplitDreaming,
  type AiIndexDreamingConfig,
} from '../../common/dreaming';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';
import type { LucidDreamingScheduler } from '../lucid_dreaming/task';

/** The workflows management API dreaming uses. */
export interface DreamingWorkflowsApi extends WorkflowEnablementApi {
  cancelAllActiveWorkflowExecutions(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
}

const CANCELLED_RUN_RETRIES = 5;
const CANCELLED_RUN_RETRY_MS = 1000;

const isRunInProgressError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('running executions');
import { managedWorkflowIdSuffixFor } from '../utils/managed_workflow_suffix';

export interface DreamingScheduleService {
  /**
   * Installs and enables the dreaming and trace dreaming workflows of an AI index that dreams,
   * and removes them from one that does not.
   */
  reconcile(params: {
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void>;
  /** Removes both dreaming workflows of an AI index. */
  remove(params: { aiIndexId: string; spaceId: string; request: KibanaRequest }): Promise<void>;
}

/** The id of the dreaming workflow of an AI index. */
export const dreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** The id of the trace dreaming workflow of an AI index. */
export const traceDreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** The id of the workflow trace dreaming runs each batch of an AI index with. */
export const traceDreamingBatchWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(
    aiIndexId,
    spaceId
  )}`;

/** The id of the workflow that links the facts and entities of an AI index. */
export const relationshipsWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** The id of the workflow lucid dreaming turns new memories of an AI index into facts with. */
export const lucidDreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_LUCID_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** The id of the workflow lucid dreaming turns new agent rounds of an AI index into facts with. */
export const lucidTraceDreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_LUCID_TRACE_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(
    aiIndexId,
    spaceId
  )}`;

/** Whether an AI index has dreaming on and configured to build something. */
export const shouldDream = ({ dreaming }: { dreaming?: AiIndexDreamingConfig }): boolean =>
  isSplitDreaming(dreaming)
    ? isLucidDreaming(dreaming) || isRelationshipDreaming(dreaming)
    : dreaming?.enabled === true && dreamingBuildsAnything(dreaming);

/** Whether an AI index builds facts and entities, on its schedule or by lucid dreaming. */
export const shouldBuildFactsAndEntities = ({
  dreaming,
}: {
  dreaming?: AiIndexDreamingConfig;
}): boolean => (isSplitDreaming(dreaming) ? isLucidDreaming(dreaming) : shouldDream({ dreaming }));

/** Whether an AI index links relationships, on its schedule or by relationship dreaming. */
export const shouldLinkRelationships = ({
  dreaming,
}: {
  dreaming?: AiIndexDreamingConfig;
}): boolean => {
  if (isSplitDreaming(dreaming)) {
    return isRelationshipDreaming(dreaming);
  }
  return (
    dreaming !== undefined &&
    shouldDream({ dreaming }) &&
    dreamingTypesOf(dreaming).relationships.length > 0
  );
};

/** The dreaming workflow template values for an AI index. */
export const dreamingTemplateValuesFor = (
  aiIndex: AiIndexItem,
  dreaming: AiIndexDreamingConfig,
  spaceId: string
): ContextEngineDreamingWorkflowTemplateValues => {
  const { facts, entities, relationships } = dreamingTypesOf(dreaming);
  return {
    aiIndexId: aiIndex.id,
    instanceKey: managedWorkflowIdSuffixFor(aiIndex.id, spaceId),
    memoriesIndex: aiIndex.dest.value,
    intervalMinutes: isSplitDreaming(dreaming)
      ? parseIntervalMinutes(
          dreaming.relationship_dreaming?.interval ?? DEFAULT_RELATIONSHIP_DREAMING_INTERVAL
        ) ?? MIN_RELATIONSHIP_DREAMING_INTERVAL_MINUTES
      : parseIntervalMinutes(dreaming.schedule?.interval ?? DEFAULT_DREAMING_INTERVAL) ??
        MIN_DREAMING_INTERVAL_MINUTES,
    connectorId: dreaming.connector_id ?? '',
    instructions: dreaming.instructions ?? '',
    factTypes: facts,
    entityTypes: entities,
    relationshipTypes: relationships,
  };
};

const DREAMING_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  label: 'dreaming',
  workflowIdFor: dreamingWorkflowIdFor,
  attach: true,
} as const;
const TRACE_DREAMING_BATCH_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
  label: 'the trace dreaming batch workflow',
  workflowIdFor: traceDreamingBatchWorkflowIdFor,
  attach: false,
} as const;
const TRACE_DREAMING_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
  label: 'trace dreaming',
  workflowIdFor: traceDreamingWorkflowIdFor,
  attach: true,
} as const;
const RELATIONSHIPS_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  label: 'relationships',
  workflowIdFor: relationshipsWorkflowIdFor,
  attach: true,
} as const;
const LUCID_DREAMING_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_LUCID_DREAMING_WORKFLOW_ID,
  label: 'lucid dreaming',
  workflowIdFor: lucidDreamingWorkflowIdFor,
  attach: true,
} as const;
const LUCID_TRACE_DREAMING_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_LUCID_TRACE_DREAMING_WORKFLOW_ID,
  label: 'lucid trace dreaming',
  workflowIdFor: lucidTraceDreamingWorkflowIdFor,
  attach: true,
} as const;

type DreamingWorkflow =
  | typeof DREAMING_WORKFLOW
  | typeof TRACE_DREAMING_BATCH_WORKFLOW
  | typeof TRACE_DREAMING_WORKFLOW
  | typeof RELATIONSHIPS_WORKFLOW
  | typeof LUCID_DREAMING_WORKFLOW
  | typeof LUCID_TRACE_DREAMING_WORKFLOW;

/** In install order: a batch workflow is installed before the workflow that runs it. */
const SCHEDULED_DREAMING_WORKFLOWS: readonly DreamingWorkflow[] = [
  DREAMING_WORKFLOW,
  TRACE_DREAMING_BATCH_WORKFLOW,
  TRACE_DREAMING_WORKFLOW,
  RELATIONSHIPS_WORKFLOW,
];
const LUCID_DREAMING_WORKFLOWS: readonly DreamingWorkflow[] = [
  TRACE_DREAMING_BATCH_WORKFLOW,
  LUCID_DREAMING_WORKFLOW,
  LUCID_TRACE_DREAMING_WORKFLOW,
];
const ALL_DREAMING_WORKFLOWS: readonly DreamingWorkflow[] = [
  ...SCHEDULED_DREAMING_WORKFLOWS,
  LUCID_DREAMING_WORKFLOW,
  LUCID_TRACE_DREAMING_WORKFLOW,
];
/** The workflows lucid dreaming prompts with its own connector. */
const LUCID_CONNECTOR_WORKFLOWS: ReadonlySet<DreamingWorkflow> = new Set([
  TRACE_DREAMING_BATCH_WORKFLOW,
  LUCID_DREAMING_WORKFLOW,
  LUCID_TRACE_DREAMING_WORKFLOW,
]);

export const createDreamingScheduleService = ({
  logger,
  getManagedWorkflowsClient,
  getWorkflowsManagement,
  getAiIndexService,
  lucidDreaming,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Resolves to `undefined` without workflows management. */
  getWorkflowsManagement: () => Promise<DreamingWorkflowsApi | undefined>;
  getAiIndexService: () => AiIndexService;
  /** Missing: lucid dreaming does not run. */
  lucidDreaming?: LucidDreamingScheduler;
}): DreamingScheduleService => {
  const log = logger.get('dreaming_schedule');

  const uninstall = async (
    workflow: DreamingWorkflow,
    aiIndexId: string,
    spaceId: string,
    request: KibanaRequest
  ) => {
    const client = await getManagedWorkflowsClient();
    const run = () =>
      client.uninstall(workflow.definitionId, {
        spaceId,
        workflowIdSuffix: managedWorkflowIdSuffixFor(aiIndexId, spaceId),
      });
    try {
      await run();
      return;
    } catch (error) {
      const workflowsManagement = await getWorkflowsManagement();
      if (!isRunInProgressError(error) || !workflowsManagement) {
        throw error;
      }
      await workflowsManagement.cancelAllActiveWorkflowExecutions(
        workflow.workflowIdFor(aiIndexId, spaceId),
        spaceId,
        request
      );
    }
    await pRetry(run, {
      retries: CANCELLED_RUN_RETRIES,
      minTimeout: CANCELLED_RUN_RETRY_MS,
      factor: 1,
      onFailedAttempt: (error) => {
        if (!isRunInProgressError(error)) {
          throw error;
        }
      },
    });
  };

  const automationFor = (workflow: DreamingWorkflow, aiIndexId: string, spaceId: string) =>
    ({ type: 'workflow', value: workflow.workflowIdFor(aiIndexId, spaceId) } as const);

  const removeWorkflows = async (
    workflows: readonly DreamingWorkflow[],
    aiIndex: AiIndexItem,
    spaceId: string,
    request: KibanaRequest
  ) => {
    for (const workflow of workflows) {
      await uninstall(workflow, aiIndex.id, spaceId, request);
      if (workflow.attach && !aiIndex.managed) {
        await getAiIndexService().removeAutomation(
          aiIndex.id,
          spaceId,
          automationFor(workflow, aiIndex.id, spaceId)
        );
      }
    }
  };

  return {
    async reconcile({ aiIndex, spaceId, request }) {
      const { id: aiIndexId, dreaming } = aiIndex;
      if (!dreaming || !shouldDream(aiIndex)) {
        await removeWorkflows(ALL_DREAMING_WORKFLOWS, aiIndex, spaceId, request);
        await lucidDreaming?.unschedule({ aiIndexId, spaceId });
        log.debug(() => `Removed dreaming for AI index '${aiIndexId}' in space '${spaceId}'`);
        return;
      }

      const workflowsManagement = await getWorkflowsManagement();
      if (!workflowsManagement) {
        throw new Error(
          `Cannot schedule dreaming for AI index '${aiIndexId}': the workflows management plugin is not available to enable the workflow, and installing it alone would leave it unscheduled.`
        );
      }

      const lucid = lucidDreaming !== undefined && isLucidDreaming(dreaming);
      const installed: readonly DreamingWorkflow[] = isSplitDreaming(dreaming)
        ? [
            ...(lucid ? LUCID_DREAMING_WORKFLOWS : []),
            ...(isRelationshipDreaming(dreaming) ? [RELATIONSHIPS_WORKFLOW] : []),
          ]
        : SCHEDULED_DREAMING_WORKFLOWS;
      await removeWorkflows(
        ALL_DREAMING_WORKFLOWS.filter((workflow) => !installed.includes(workflow)),
        aiIndex,
        spaceId,
        request
      );

      const values = dreamingTemplateValuesFor(aiIndex, dreaming, spaceId);
      const lucidValues = {
        ...values,
        connectorId: dreaming.lucid?.connector_id ?? values.connectorId,
      };
      const client = await getManagedWorkflowsClient();
      for (const workflow of installed) {
        await client.install(workflow.definitionId, {
          spaceId,
          workflowIdSuffix: managedWorkflowIdSuffixFor(aiIndexId, spaceId),
          values: lucid && LUCID_CONNECTOR_WORKFLOWS.has(workflow) ? lucidValues : values,
        });

        const workflowId = workflow.workflowIdFor(aiIndexId, spaceId);
        await workflowsManagement.updateWorkflow(workflowId, { enabled: true }, spaceId, request);

        if (workflow.attach && !aiIndex.managed) {
          await getAiIndexService().addAutomation(
            aiIndexId,
            spaceId,
            automationFor(workflow, aiIndexId, spaceId)
          );
        }

        log.info(
          `Installed ${workflow.label} for AI index '${aiIndexId}' in space '${spaceId}' every ${values.intervalMinutes}m, running as the user who saved its config`
        );
      }

      if (lucid) {
        const interval = dreaming.lucid?.interval ?? DEFAULT_LUCID_DREAMING_INTERVAL;
        await lucidDreaming.schedule({ aiIndexId, spaceId, request, interval });
        log.info(
          `Watching AI index '${aiIndexId}' in space '${spaceId}' for lucid dreaming every ${interval}, as the user who saved its config`
        );
      } else {
        await lucidDreaming?.unschedule({ aiIndexId, spaceId });
      }
    },

    async remove({ aiIndexId, spaceId, request }) {
      for (const workflow of ALL_DREAMING_WORKFLOWS) {
        await uninstall(workflow, aiIndexId, spaceId, request);
      }
      await lucidDreaming?.unschedule({ aiIndexId, spaceId });
      log.debug(() => `Removed dreaming for deleted AI index '${aiIndexId}' in space '${spaceId}'`);
    },
  };
};
