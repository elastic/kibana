/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  applyMaintenanceChangesStepCommonDefinition,
  type ApplyMaintenanceChangesOutput,
  type MaintenanceChangeSet,
} from '../../common/step_types/apply_maintenance_changes';
import {
  MAX_MAINTENANCE_BATCH_REMOVALS_PERCENT,
  MAX_MAINTENANCE_LISTED_CHANGES,
  MIN_MAINTENANCE_BATCH_REMOVALS,
  type MaintenanceHeldBack,
} from '../../common/step_types/gather_maintenance';
import { isKiDeleted } from '../ai_indices/ki_revision';
import type { ApplyContext, PlannedWrite } from '../dreaming/apply';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { kiUri } from '../dreaming/ids';
import { applyMaintenanceGroups, emptyApplyResult } from '../maintenance/apply_maintenance';
import { audienceOf, parseRelationship } from '../maintenance/gather';
import { modelRemovalsOf, removalLimitOf } from '../maintenance/limits';
import { parseMaintenanceChanges } from '../maintenance/parse_changes';
import { createMaintenanceReader } from '../maintenance/reader';
import { resolveMaintenanceChanges, type MaintenanceGroup } from '../maintenance/resolve_changes';
import { resolveDreamingAiIndex } from './gather_maintenance';
import type { DreamingKiStepDependencies } from './helpers';
import {
  assertDreamingAvailable,
  assertKiWritePrivilege,
  assertWritableDest,
  kiWriterFromContext,
} from './helpers';

const EMPTY_CHANGE_SET: MaintenanceChangeSet = {
  merges: [],
  contradictions: [],
  rewrites: [],
  summaries: [],
  relationships: [],
};

/** Items whose relationships a change set may move or remove. */
const mergedIdsOf = ({ merges, contradictions }: MaintenanceChangeSet): string[] => [
  ...merges.flatMap(({ survivor, absorbed }) => [survivor, ...absorbed]),
  ...contradictions.flatMap(({ ids }) => ids),
];

const namedIdsOf = (changeSet: MaintenanceChangeSet): string[] => [
  ...mergedIdsOf(changeSet),
  ...changeSet.rewrites.map(({ id }) => id),
  ...changeSet.summaries.map(({ id }) => id),
  ...changeSet.relationships.map(({ id }) => id),
];

export const getApplyMaintenanceChangesStepDefinition = ({
  getAiIndexService,
  isDreamingAvailable,
  checkWritePrivilege,
  logger,
}: DreamingKiStepDependencies) =>
  createServerStepDefinition({
    ...applyMaintenanceChangesStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const stepContext = context.contextManager.getContext();
      const { spaceId } = stepContext.workflow;
      await assertDreamingAvailable(isDreamingAvailable, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

      const {
        ai_index_id: aiIndexId,
        batch,
        fixes = [],
        plan_only: planOnly = false,
      } = context.input;
      if (batch && context.input.changes === undefined) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: 'Pass the changes the model returned for the batch',
        });
      }
      const parsed = parseMaintenanceChanges(context.input.changes);
      if ('error' in parsed) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `The maintenance model returned invalid changes: ${parsed.error}`,
        });
      }
      const changeSet = batch ? parsed.changeSet : EMPTY_CHANGE_SET;

      const aiIndex = await resolveDreamingAiIndex(getAiIndexService, aiIndexId, spaceId);
      assertWritableDest(aiIndexId, aiIndex.dest);
      const esClient = context.contextManager.getScopedEsClient();
      const reader = createMaintenanceReader({
        esClient,
        dest: aiIndex.dest,
        spaceId,
        abortSignal: context.abortSignal,
      });

      const kis = new Map(
        await reader.latestByIds([
          ...(batch?.items ?? []).map(({ id }) => id),
          ...(batch?.neighbors ?? []).map(({ id }) => id),
          ...(batch?.relationships ?? []).map(({ id }) => id),
          ...namedIdsOf(changeSet),
          ...fixes.map(({ id }) => id),
        ])
      );
      const mergedIds = mergedIdsOf(changeSet);
      const linking = mergedIds.length
        ? (await reader.citing(mergedIds.map(kiUri), 'relationships')).filter(
            (ki) => !isKiDeleted(ki)
          )
        : [];
      const links = new Map<string, DreamedKi[]>();
      const endIds: string[] = [];
      for (const link of linking) {
        const parsedLink = parseRelationship(link);
        for (const endId of parsedLink ? [parsedLink.from, parsedLink.to] : []) {
          links.set(endId, [...(links.get(endId) ?? []), link]);
          endIds.push(endId);
        }
      }
      const ends = await reader.latestByIds(endIds.filter((endId) => !kis.has(endId)));
      for (const [endId, ki] of ends) {
        kis.set(endId, ki);
      }

      const audienceKi = batch?.items
        .map(({ id }) => kis.get(id))
        .find(
          (ki): ki is DreamedKi =>
            ki !== undefined && !isKiDeleted(ki) && audienceOf(ki) === batch.audience
        );
      const resolved = batch
        ? resolveMaintenanceChanges(changeSet, { batch, kis, links, spaceId })
        : { groups: [], needsReview: [], rejected: [] };
      if (batch && !audienceKi) {
        resolved.rejected.push(
          ...resolved.groups.map(({ item }) => ({
            item,
            reason: 'no item of the batch is left to take its permissions from',
          }))
        );
        resolved.groups = [];
      }
      const heldBack: MaintenanceHeldBack[] = [];
      const planned = resolved.groups.flatMap(({ changes }) => changes);
      const removals = modelRemovalsOf(planned);
      const removalLimit = removalLimitOf(
        batch?.items.length ?? 0,
        MAX_MAINTENANCE_BATCH_REMOVALS_PERCENT,
        MIN_MAINTENANCE_BATCH_REMOVALS
      );
      if (batch && removals > removalLimit) {
        heldBack.push({
          reason: `The model would remove ${removals} items for a batch of ${batch.items.length}, more than the ${removalLimit} one batch may.`,
          changes: [...planned, ...resolved.needsReview].slice(0, MAX_MAINTENANCE_LISTED_CHANGES),
        });
        resolved.groups = [];
        resolved.needsReview = [];
      }

      const dryRun = planOnly ? new Map<string, PlannedWrite>() : undefined;
      const applyContext: ApplyContext = {
        esClient,
        aiIndexId,
        dest: aiIndex.dest,
        writer: kiWriterFromContext(stepContext),
        spaceId,
        memoryPermissions: new Map(),
        abortSignal: context.abortSignal,
        dryRun,
      };
      const fixGroups: MaintenanceGroup[] = fixes.map((fix) => ({
        item: `fix ${fix.id}`,
        writes: [],
        moves: [],
        tombstones: [fix.id],
        changes: [fix],
      }));
      const result = await applyMaintenanceGroups(
        { ...applyContext, audience: 'own' },
        fixGroups,
        emptyApplyResult()
      );
      await applyMaintenanceGroups(
        { ...applyContext, audience: { permissions: audienceKi?.permissions } },
        resolved.groups,
        result
      );

      const rejected = [
        ...(batch ? parsed.rejected : []),
        ...resolved.rejected,
        ...result.rejected,
      ];
      logger.debug(
        `${planOnly ? 'Plan: maintenance' : 'Maintenance'} of AI index '${aiIndexId}' wrote ${
          result.written
        } KIs and tombstoned ${result.tombstoned.length}; ${
          resolved.needsReview.length
        } for review, ${rejected.length} rejected${heldBack.length > 0 ? '; batch held back' : ''}`
      );
      const output: ApplyMaintenanceChangesOutput = {
        written: result.written,
        changes: result.changes,
        needs_review: resolved.needsReview,
        rejected,
        held_back: heldBack,
        removals: modelRemovalsOf(result.changes),
        ...(planOnly &&
          batch &&
          context.input.changes && {
            plans: heldBack.length > 0 ? [] : [{ batch, changes: context.input.changes }],
          }),
      };
      return { output };
    },
  });
