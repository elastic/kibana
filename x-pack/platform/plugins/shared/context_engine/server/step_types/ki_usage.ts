/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  getKiUsageStepCommonDefinition,
  recordKiEnrichmentStepCommonDefinition,
} from '../../common/step_types/ki_usage';
import { selectDueForEnrichment, type KiUsageServiceApi } from '../ki_usage/ki_usage_service';
import {
  assertContextEngineEnabled,
  assertKiReadPrivilege,
  assertKiWritePrivilege,
} from './helpers';
import { toStepError } from './to_step_error';

const DEFAULT_USAGE_LIMIT = 100;

export interface KiUsageStepDependencies {
  getKiUsageService: () => KiUsageServiceApi;
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
  checkReadPrivilege: (request: KibanaRequest, spaceId: string) => Promise<boolean>;
  checkWritePrivilege: (request: KibanaRequest, spaceId: string) => Promise<boolean>;
}

export const getGetKiUsageStepDefinition = ({
  getKiUsageService,
  isContextEngineEnabled,
  checkReadPrivilege,
}: KiUsageStepDependencies) =>
  createServerStepDefinition({
    ...getKiUsageStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const { spaceId } = context.contextManager.getContext().workflow;
        await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
        await assertKiReadPrivilege(checkReadPrivilege, request, spaceId);

        const {
          ki_ids: kiIds,
          min_new_accesses: minNewAccesses = 0,
          min_days_since_enrichment: minDaysBetweenEnrichments = 0,
          limit = DEFAULT_USAGE_LIMIT,
        } = context.input;
        const usage = await getKiUsageService().getUsage({ spaceId, kiIds });
        return {
          output: {
            kis: selectDueForEnrichment(
              usage,
              { minNewAccesses, minDaysBetweenEnrichments, limit },
              new Date()
            ),
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to read KI usage');
      }
    },
  });

export const getRecordKiEnrichmentStepDefinition = ({
  getKiUsageService,
  isContextEngineEnabled,
  checkWritePrivilege,
}: KiUsageStepDependencies) =>
  createServerStepDefinition({
    ...recordKiEnrichmentStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const { spaceId } = context.contextManager.getContext().workflow;
        await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
        await assertKiWritePrivilege(checkWritePrivilege, request, spaceId);

        const kiIds = [...new Set(context.input.ki_ids)];
        await getKiUsageService().recordEnrichment({ spaceId, kiIds });
        return { output: { recorded: kiIds.length } };
      } catch (error) {
        throw toStepError(error, 'Failed to record KI enrichment');
      }
    },
  });
