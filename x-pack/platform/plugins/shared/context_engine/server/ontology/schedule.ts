/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import {
  CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW_ID,
  CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW_ID,
  type ContextEngineOntologyWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { dreamingTypesOf } from '../../common/dreaming';
import type { AiIndexItem, AiIndexSource } from '../../common/http_api/ai_indices';
import { discoversOntology } from '../../common/ontology';
import type { AiIndexService } from '../ai_indices/service';
import { createVerifyEsql } from '../dreaming/access_patterns';
import { dreamingTemplateValuesFor, type DreamingWorkflowsApi } from '../dreaming/schedule';
import { managedWorkflowIdSuffixFor } from '../utils/managed_workflow_suffix';
import { removeOntologySource } from './apply';
import { ontologySourceId } from './ids';

const CANCELLED_RUN_RETRIES = 5;
const CANCELLED_RUN_RETRY_MS = 1000;

const isRunInProgressError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('running executions');

type OntologyDefinitionId =
  | typeof CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW_ID
  | typeof CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW_ID;

/** The managed workflow definition that describes a source: one for ES|QL, one for connectors. */
export const ontologyDefinitionIdFor = ({
  type,
}: Pick<AiIndexSource, 'type'>): OntologyDefinitionId =>
  type === 'esql'
    ? CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW_ID
    : CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW_ID;

/** The managed workflow id suffix of one source of an AI index. */
export const ontologyWorkflowIdSuffixFor = (
  aiIndexId: string,
  spaceId: string,
  sourceId: string
): string => `${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}-${sourceId}`;

/** The id of the ontology discovery workflow of one source of an AI index. */
export const ontologyWorkflowIdFor = (
  aiIndexId: string,
  spaceId: string,
  source: Pick<AiIndexSource, 'type' | 'value'>
): string =>
  `${ontologyDefinitionIdFor(source)}-${ontologyWorkflowIdSuffixFor(
    aiIndexId,
    spaceId,
    ontologySourceId(source)
  )}`;

/** The sources of an AI index ontology discovery describes, by id: all of them while it is on. */
export const ontologySourcesOf = (aiIndex: AiIndexItem | undefined): Map<string, AiIndexSource> =>
  aiIndex && discoversOntology(aiIndex)
    ? new Map(aiIndex.sources.map((source) => [ontologySourceId(source), source]))
    : new Map();

/** The template values of the ontology discovery workflow of one source. */
export const ontologyTemplateValuesFor = (
  aiIndex: AiIndexItem,
  source: AiIndexSource,
  spaceId: string
): ContextEngineOntologyWorkflowTemplateValues => {
  if (!aiIndex.dreaming) {
    throw new Error(`AI index '${aiIndex.id}' has no dreaming config`);
  }
  return {
    ...dreamingTemplateValuesFor(aiIndex, aiIndex.dreaming, spaceId),
    sourceId: ontologySourceId(source),
    sourceValue: source.value,
  };
};

export interface OntologyScheduleService {
  /**
   * Installs, enables and attaches one workflow per source of an AI index with ontology
   * discovery on. A source the AI index no longer has loses its workflow and what it wrote; with
   * discovery off, sources keep what they wrote and lose only their workflows.
   */
  reconcile(params: {
    aiIndex: AiIndexItem;
    previous?: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void>;
  /** Removes the workflows of every source of a deleted AI index, and what they wrote. */
  remove(params: { previous: AiIndexItem; spaceId: string; request: KibanaRequest }): Promise<void>;
}

export const createOntologyScheduleService = ({
  logger,
  getManagedWorkflowsClient,
  getWorkflowsManagement,
  getAiIndexService,
  getScopedEsClient,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Resolves to `undefined` without workflows management. */
  getWorkflowsManagement: () => Promise<DreamingWorkflowsApi | undefined>;
  getAiIndexService: () => AiIndexService;
  /** An Elasticsearch client acting as the user who saved the AI index. */
  getScopedEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
}): OntologyScheduleService => {
  const log = logger.get('ontology_schedule');

  const uninstall = async (
    aiIndexId: string,
    spaceId: string,
    source: AiIndexSource,
    request: KibanaRequest
  ) => {
    const client = await getManagedWorkflowsClient();
    const run = () =>
      client.uninstall(ontologyDefinitionIdFor(source), {
        spaceId,
        workflowIdSuffix: ontologyWorkflowIdSuffixFor(aiIndexId, spaceId, ontologySourceId(source)),
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
        ontologyWorkflowIdFor(aiIndexId, spaceId, source),
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

  const automationFor = (aiIndexId: string, spaceId: string, source: AiIndexSource) =>
    ({ type: 'workflow', value: ontologyWorkflowIdFor(aiIndexId, spaceId, source) } as const);

  /** Uninstalls a source's workflow, detaches it, and removes what it wrote. */
  const removeSource = async (
    aiIndex: AiIndexItem,
    source: AiIndexSource,
    spaceId: string,
    request: KibanaRequest,
    { detach }: { detach: boolean }
  ) => {
    const { id: aiIndexId } = aiIndex;
    await uninstall(aiIndexId, spaceId, source, request);
    if (detach && !aiIndex.managed) {
      await getAiIndexService().removeAutomation(
        aiIndexId,
        spaceId,
        automationFor(aiIndexId, spaceId, source)
      );
    }
    const workflowId = ontologyWorkflowIdFor(aiIndexId, spaceId, source);
    const esClient = await getScopedEsClient(request);
    try {
      const removed = await removeOntologySource({
        esClient,
        aiIndexId,
        dest: aiIndex.dest,
        writer: { uri: `workflow://${workflowId}`, metadata: { space_id: spaceId } },
        spaceId,
        sourceId: ontologySourceId(source),
        entityTypes: [],
        verifyEsql: createVerifyEsql({ esClient, logger: log }),
      });
      log.debug(
        () =>
          `Removed ontology discovery of ${source.type} source '${ontologySourceId(
            source
          )}' of AI index '${aiIndexId}' in space '${spaceId}': deleted ${
            removed.deleted
          } and updated ${removed.updated} KIs`
      );
    } catch (error) {
      log.warn(
        `Could not remove what ontology discovery wrote for a source of AI index '${aiIndexId}' in space '${spaceId}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return {
    async reconcile({ aiIndex, previous, spaceId, request }) {
      const { id: aiIndexId } = aiIndex;
      const wanted = ontologySourcesOf(aiIndex);
      const kept = new Set(aiIndex.sources.map(ontologySourceId));
      for (const source of previous?.sources ?? []) {
        const sourceId = ontologySourceId(source);
        if (!kept.has(sourceId)) {
          await removeSource(previous ?? aiIndex, source, spaceId, request, { detach: true });
        } else if (!wanted.has(sourceId) && previous && discoversOntology(previous)) {
          // Discovery turned off: the workflow goes, what it wrote stays until the source does.
          await uninstall(aiIndexId, spaceId, source, request);
          if (!aiIndex.managed) {
            await getAiIndexService().removeAutomation(
              aiIndexId,
              spaceId,
              automationFor(aiIndexId, spaceId, source)
            );
          }
        }
      }
      if (wanted.size === 0) {
        return;
      }

      const workflowsManagement = await getWorkflowsManagement();
      if (!workflowsManagement) {
        throw new Error(
          `Cannot schedule ontology discovery for AI index '${aiIndexId}': the workflows management plugin is not available to enable the workflow, and installing it alone would leave it unscheduled.`
        );
      }
      const client = await getManagedWorkflowsClient();
      for (const [sourceId, source] of wanted) {
        await client.install(ontologyDefinitionIdFor(source), {
          spaceId,
          workflowIdSuffix: ontologyWorkflowIdSuffixFor(aiIndexId, spaceId, sourceId),
          values: ontologyTemplateValuesFor(aiIndex, source, spaceId),
        });
        await workflowsManagement.updateWorkflow(
          ontologyWorkflowIdFor(aiIndexId, spaceId, source),
          { enabled: true },
          spaceId,
          request
        );
        if (!aiIndex.managed) {
          await getAiIndexService().addAutomation(
            aiIndexId,
            spaceId,
            automationFor(aiIndexId, spaceId, source)
          );
        }
        log.info(
          `Installed ontology discovery for ${
            source.type
          } source '${sourceId}' of AI index '${aiIndexId}' in space '${spaceId}' (${
            dreamingTypesOf(aiIndex.dreaming ?? { enabled: false }).entities.length > 0
              ? 'configured entity types take precedence'
              : 'onboarding: no entity types configured'
          }), running as the user who saved its config`
        );
      }
    },

    async remove({ previous, spaceId, request }) {
      for (const source of previous.sources) {
        await removeSource(previous, source, spaceId, request, { detach: false });
      }
    },
  };
};
