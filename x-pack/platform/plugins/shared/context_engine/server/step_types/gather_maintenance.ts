/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { maintenanceConfigOf } from '../../common/dreaming';
import { gatherMaintenanceStepCommonDefinition } from '../../common/step_types/gather_maintenance';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { gatherMaintenance } from '../maintenance/gather';
import { createMaintenanceReader } from '../maintenance/reader';
import type { DreamingKiStepDependencies } from './helpers';
import { assertDreamingAvailable, assertKiWritePrivilege, kiWriterFromContext } from './helpers';

/** Resolves an AI index with a dreaming config, failing the step when there is none. */
export const resolveDreamingAiIndex = async (
  getAiIndexService: DreamingKiStepDependencies['getAiIndexService'],
  aiIndexId: string,
  spaceId: string
): Promise<AiIndexItem & Required<Pick<AiIndexItem, 'dreaming'>>> => {
  let aiIndex: AiIndexItem;
  try {
    aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
  } catch (error) {
    if (error instanceof AiIndexNotFoundError) {
      throw new ExecutionError({
        type: 'NotFoundError',
        message: `AI index '${aiIndexId}' not found`,
      });
    }
    throw error;
  }
  const { dreaming } = aiIndex;
  if (!dreaming) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: `AI index '${aiIndexId}' has no dreaming config`,
    });
  }
  return { ...aiIndex, dreaming };
};

export const getGatherMaintenanceStepDefinition = ({
  getAiIndexService,
  isDreamingAvailable,
  checkWritePrivilege,
  logger,
}: DreamingKiStepDependencies) =>
  createServerStepDefinition({
    ...gatherMaintenanceStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const stepContext = context.contextManager.getContext();
      const { spaceId } = stepContext.workflow;
      await assertDreamingAvailable(isDreamingAvailable, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

      const {
        ai_index_id: aiIndexId,
        since,
        after_id: afterId,
        sweep_after_id: sweepAfterId,
      } = context.input;
      const aiIndex = await resolveDreamingAiIndex(getAiIndexService, aiIndexId, spaceId);
      const {
        neighbors,
        sweep_size: sweepSize,
        max_tombstone_share: maxTombstoneShare,
      } = maintenanceConfigOf(aiIndex.dreaming.maintenance);

      const output = await gatherMaintenance(
        createMaintenanceReader({
          esClient: context.contextManager.getScopedEsClient(),
          dest: aiIndex.dest,
          spaceId,
          abortSignal: context.abortSignal,
        }),
        {
          spaceId,
          writerUri: kiWriterFromContext(stepContext).uri,
          neighbors,
          sweepSize,
          maxTombstoneShare,
          since,
          ...(afterId && { afterId }),
          ...(sweepAfterId && { sweepAfterId }),
        }
      );

      logger.debug(
        `Maintenance of AI index '${aiIndexId}' gathered ${output.reviewed} items in ${output.batches.length} batches, ${output.fixes.length} fixes and ${output.needs_review.length} items for review`
      );
      return { output };
    },
  });
