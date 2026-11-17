/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { StepContext } from '@kbn/workflows';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import {
  listResearchSourcesStepCommonDefinition,
  type ListResearchSourcesOutput,
} from '../../common/step_types/list_research_sources';
import { describeResearchSources } from '../dreaming/research';
import type { ResearchStepDependencies } from './helpers';
import {
  assertDreamingAvailable,
  assertKiReadPrivilege,
  assertKiWritePrivilege,
  assertWritableDest,
  getAiIndexOrFail,
} from './helpers';

/** What every enrichment, wiki and research step resolves before it runs. */
export interface ResearchStepContext {
  request: KibanaRequest;
  stepContext: StepContext;
  spaceId: string;
  aiIndex: AiIndexItem;
  esClient: ElasticsearchClient;
}

/**
 * Checks that dreaming is available and the workflow user may read, or write, the AI index, then
 * resolves it.
 */
export const prepareResearchStep = async (
  {
    isDreamingAvailable,
    checkReadPrivilege,
    checkWritePrivilege,
    getAiIndexService,
  }: ResearchStepDependencies,
  context: Pick<StepHandlerContext, 'contextManager'>,
  aiIndexId: string,
  access: 'read' | 'write'
): Promise<ResearchStepContext> => {
  const request = context.contextManager.getFakeRequest();
  const stepContext = context.contextManager.getContext();
  const { spaceId } = stepContext.workflow;
  await assertDreamingAvailable(isDreamingAvailable, spaceId);
  if (access === 'write') {
    await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);
  } else {
    await assertKiReadPrivilege(checkReadPrivilege, request, spaceId);
  }
  const aiIndex = await getAiIndexOrFail(getAiIndexService, aiIndexId, spaceId);
  if (access === 'write') {
    assertWritableDest(aiIndexId, aiIndex.dest);
  }
  return {
    request,
    stepContext,
    spaceId,
    aiIndex,
    esClient: context.contextManager.getScopedEsClient(),
  };
};

export const getListResearchSourcesStepDefinition = (deps: ResearchStepDependencies) =>
  createServerStepDefinition({
    ...listResearchSourcesStepCommonDefinition,
    handler: async (context) => {
      const { request, aiIndex } = await prepareResearchStep(
        deps,
        context,
        context.input.ai_index_id,
        'read'
      );
      const actionsClient = await (await deps.getActions()).getActionsClientWithRequest(request);
      const sources = await describeResearchSources({ sources: aiIndex.sources, actionsClient });
      const output: ListResearchSourcesOutput = {
        sources,
        usable: sources.filter(({ error }) => error === undefined).length,
      };
      return { output };
    },
  });
