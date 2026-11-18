/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { resolveOntologyConfig } from '../../common/ontology';
import {
  applyOntologyChangesStepCommonDefinition,
  ontologyChangeSetSchema,
  type ApplyOntologyChangesOutput,
} from '../../common/step_types/apply_ontology_changes';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { createVerifyEsql } from '../dreaming/access_patterns';
import type { PlannedWrite } from '../dreaming/apply';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { applyOntologyChanges } from '../ontology/apply';
import { dreamingTypesOf } from '../../common/dreaming';
import type { DreamingKiStepDependencies } from './helpers';
import { connectorCallerFor, findSource, type OntologyStepExtras } from './ontology_helpers';
import {
  assertDreamingAvailable,
  assertKiWritePrivilege,
  assertWritableDest,
  kiWriterFromContext,
} from './helpers';

export const getApplyOntologyChangesStepDefinition = (
  {
    getAiIndexService,
    isDreamingAvailable,
    checkWritePrivilege,
    logger,
    getActions,
  }: DreamingKiStepDependencies & OntologyStepExtras,
  { getCurrentDate = () => new Date() }: { getCurrentDate?: () => Date } = {}
) =>
  createServerStepDefinition({
    ...applyOntologyChangesStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const stepContext = context.contextManager.getContext();
      const { spaceId } = stepContext.workflow;
      await assertDreamingAvailable(isDreamingAvailable, spaceId);
      await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

      const {
        ai_index_id: aiIndexId,
        source_id: sourceId,
        catalog,
        profiles,
        joins,
        stale,
        dry_run: dryRun = false,
      } = context.input;
      const parsed = ontologyChangeSetSchema.safeParse(context.input.changes ?? {});
      if (!parsed.success) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `The ontology model returned an invalid change set: ${parsed.error.message}`,
        });
      }

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
      assertWritableDest(aiIndexId, aiIndex.dest);
      if (!resolveOntologyConfig(aiIndex.dreaming?.ontology).enabled) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `AI index '${aiIndexId}' does not have ontology discovery turned on`,
        });
      }

      const source = findSource(aiIndex, sourceId);
      if (!source) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `AI index '${aiIndexId}' has no source '${sourceId}' any more`,
        });
      }
      const connector =
        source.type === 'connector'
          ? await connectorCallerFor(getActions, request, source.value)
          : undefined;

      const esClient = context.contextManager.getScopedEsClient();
      const planned = dryRun ? new Map<string, PlannedWrite>() : undefined;
      const result = await applyOntologyChanges(
        {
          esClient,
          aiIndexId,
          dest: aiIndex.dest,
          writer: kiWriterFromContext(stepContext),
          spaceId,
          sourceId,
          entityTypes: dreamingTypesOf(aiIndex.dreaming ?? { enabled: false }).entities,
          ...(connector && {
            connectorId: source.value,
            verifyConnectorCall: connector.verify,
          }),
          verifyEsql: createVerifyEsql({ esClient, logger, abortSignal: context.abortSignal }),
          abortSignal: context.abortSignal,
          dryRun: planned,
          now: getCurrentDate(),
        },
        {
          catalog,
          profiles: profiles ?? [],
          changes: parsed.data,
          joins: joins ?? [],
          stale: stale ?? [],
        }
      );

      logger.debug(
        `${
          dryRun ? 'Dry run: ontology discovery' : 'Ontology discovery'
        } in AI index '${aiIndexId}' created ${result.created}, updated ${
          result.updated
        } and deleted ${result.deleted} KIs; rejected ${result.rejected.length} items and dropped ${
          result.dropped_access_patterns
        } access patterns`
      );
      const output: ApplyOntologyChangesOutput = {
        ...result,
        ...(planned && {
          would_write: [...planned].map(([id, { change, ki }]) => {
            const document = ki as DreamedKi | undefined;
            return {
              id,
              change,
              ...(document && { type: document.type, title: document.title }),
            };
          }),
        }),
      };
      return { output };
    },
  });
