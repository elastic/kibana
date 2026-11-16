/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { kiTypeFiltersOf } from '../../common/dreaming';
import {
  applyWikiPageStepCommonDefinition,
  gatherWikiPageStepCommonDefinition,
  type ApplyWikiPageOutput,
  type GatherWikiPageOutput,
} from '../../common/step_types/wiki';
import { applyWikiPage, gatherWikiPage } from '../dreaming/wiki';
import type { ResearchStepDependencies } from './helpers';
import { kiWriterFromContext } from './helpers';
import { prepareResearchStep } from './research_steps';

export const getGatherWikiPageStepDefinition = (deps: ResearchStepDependencies) =>
  createServerStepDefinition({
    ...gatherWikiPageStepCommonDefinition,
    handler: async (context) => {
      const {
        ai_index_id: aiIndexId,
        page_ref: pageRef,
        seed_ids: seedIds,
        member_query: memberQuery,
        max_members: maxMembers,
      } = context.input;
      const { spaceId, aiIndex, esClient } = await prepareResearchStep(
        deps,
        context,
        aiIndexId,
        'read'
      );
      const output: GatherWikiPageOutput = await gatherWikiPage({
        esClient,
        aiIndexId,
        dest: aiIndex.dest,
        spaceId,
        ...(pageRef !== undefined && { pageRef }),
        seedIds,
        ...(memberQuery !== undefined && { memberQuery }),
        kiTypes: kiTypeFiltersOf(aiIndex.dreaming?.wiki),
        ...(maxMembers !== undefined && { maxMembers }),
        logger: deps.logger,
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });

export const getApplyWikiPageStepDefinition = (deps: ResearchStepDependencies) =>
  createServerStepDefinition({
    ...applyWikiPageStepCommonDefinition,
    handler: async (context) => {
      const {
        ai_index_id: aiIndexId,
        page_ref: pageRef,
        page,
        evidence,
        dry_run: dryRun = false,
      } = context.input;
      const { spaceId, aiIndex, esClient, stepContext } = await prepareResearchStep(
        deps,
        context,
        aiIndexId,
        'write'
      );
      const outcome = await applyWikiPage({
        esClient,
        aiIndexId,
        dest: aiIndex.dest,
        spaceId,
        writer: kiWriterFromContext(stepContext),
        ...(pageRef !== undefined && { pageRef }),
        change: page,
        evidence,
        dryRun,
        abortSignal: context.abortSignal,
      });
      deps.logger.debug(
        `${dryRun ? 'Dry run: wiki page' : 'Wiki page'} '${
          outcome.id ?? page.title
        }' in AI index '${aiIndexId}': ${
          outcome.status === 'skipped'
            ? `skipped, ${outcome.reason}`
            : `${outcome.status} with ${outcome.members} members, citing ${outcome.cited.length} results`
        }`
      );
      const { document } = outcome;
      const output: ApplyWikiPageOutput = {
        status: outcome.status,
        ...(outcome.id !== undefined && { id: outcome.id }),
        ...(outcome.reason !== undefined && { reason: outcome.reason }),
        members: outcome.members,
        cited: outcome.cited,
        dropped_citations: outcome.dropped_citations,
        tally: {
          created: outcome.status === 'created' ? 1 : 0,
          updated: outcome.status === 'updated' ? 1 : 0,
          skipped: outcome.status === 'skipped' ? 1 : 0,
        },
        would_write:
          dryRun && document && outcome.status !== 'skipped'
            ? [
                {
                  id: document.id,
                  change: outcome.status,
                  type: document.type,
                  title: document.title,
                },
              ]
            : [],
        ...(document && { document }),
      };
      return { output };
    },
  });
