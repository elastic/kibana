/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TRACE_CLASSIFIER_TASK_TYPE } from '../../common/constants';
import type { CaseDocument } from '../cases/storage';
import { CasesService } from '../cases/service';
import { PatternsService } from '../patterns/service';
import {
  CLASSIFIER_VERSION,
  classifyCase,
  mergePattern,
  partitionFor,
  patternKeyFor,
} from './classify';

const CLASSIFY_BATCH = 500;

/**
 * `trace_classifier` Task Manager task: labels unclassified cases against the
 * taxonomy (deterministic v1) and aggregates them into failure patterns. The
 * LLM refinement is layered on later; this pass already surfaces query errors,
 * empty retrievals, and coverage gaps.
 */
export const registerTraceClassifierTask = (
  taskManager: TaskManagerSetupContract,
  { core, logger }: { core: CoreSetup; logger: Logger }
) => {
  taskManager.registerTaskDefinitions({
    [TRACE_CLASSIFIER_TASK_TYPE]: {
      title: 'Context Engine: trace classifier',
      timeout: '10m',
      createTaskRunner: ({ taskInstance }: RunContext) => ({
        async run() {
          const { aiIndexId } = taskInstance.params as { aiIndexId: string };

          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const casesService = new CasesService({ esClient, logger });
          const patternsService = new PatternsService({ esClient, logger });

          const cases = await casesService.list({
            aiIndexId,
            unclassifiedOnly: true,
            size: CLASSIFY_BATCH,
          });
          if (cases.length === 0) {
            return { state: {} };
          }

          const batches = new Map<
            string,
            { type: string; subType?: string; cases: CaseDocument[] }
          >();
          const updated: CaseDocument[] = [];

          for (const kase of cases) {
            const labels = classifyCase(kase);
            const partition = partitionFor(kase.round_id);
            const primary = labels[0];
            const patternKey = primary ? patternKeyFor(primary, kase) : undefined;
            const classified: CaseDocument = {
              ...kase,
              labels,
              pattern_key: patternKey,
              partition,
              classified: true,
              classifier_version: CLASSIFIER_VERSION,
            };
            updated.push(classified);

            if (primary && patternKey) {
              const entry = batches.get(patternKey) ?? {
                type: primary.type,
                subType: primary.sub_type,
                cases: [],
              };
              entry.cases.push(classified);
              batches.set(patternKey, entry);
            }
          }

          await casesService.write(updated);

          for (const [patternKey, { type, subType, cases: patternCases }] of batches) {
            const existing = await patternsService.get(patternKey);
            const merged = mergePattern({
              existing,
              patternKey,
              type,
              subType,
              aiIndexId,
              cases: patternCases,
            });
            await patternsService.upsert(merged);
          }

          logger.debug(
            `trace_classifier[${aiIndexId}]: classified ${updated.length} cases into ${batches.size} patterns`
          );
          return { state: {} };
        },
      }),
    },
  });
};
