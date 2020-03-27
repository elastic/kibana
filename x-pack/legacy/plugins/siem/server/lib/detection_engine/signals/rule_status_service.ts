/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRuleStatusSavedObjects } from './get_rule_status_saved_objects';
import { getCurrentStatusSavedObject } from './get_current_status_saved_object';
import { IRuleStatusAttributes, RuleStatusString } from '../rules/types';
import { RuleStatusSavedObjectsClient } from './rule_status_saved_objects_client';
import { assertUnreachable } from '../../../utils/build_query';

// 1st is mutable status, followed by 5 most recent failures
export const MAX_RULE_STATUSES = 6;

interface Attributes {
  searchAfterTimeDurations?: string[];
  bulkCreateTimeDurations?: string[];
  lastLookBackDate?: string;
  gap?: string;
}

export interface RuleStatusService {
  goingToRun: () => Promise<void>;
  success: (message: string, attributes?: Attributes) => Promise<void>;
  error: (message: string, attributes?: Attributes) => Promise<void>;
}

export const buildRuleStatusAttributes: (
  status: RuleStatusString,
  message?: string,
  attributes?: Attributes
) => Partial<IRuleStatusAttributes> = (status, message, attributes = {}) => {
  const now = new Date().toISOString();
  const baseAttributes: Partial<IRuleStatusAttributes> = {
    ...attributes,
    status,
    statusDate: now,
  };

  switch (status) {
    case 'succeeded': {
      return {
        ...baseAttributes,
        lastSuccessAt: now,
        lastSuccessMessage: message,
      };
    }
    case 'failed': {
      return {
        ...baseAttributes,
        lastFailureAt: now,
        lastFailureMessage: message,
      };
    }
    case 'going to run': {
      return baseAttributes;
    }
  }

  assertUnreachable(status);
};

export const ruleStatusServiceFactory = async ({
  alertId,
  ruleStatusClient,
}: {
  alertId: string;
  ruleStatusClient: RuleStatusSavedObjectsClient;
}): Promise<RuleStatusService> => {
  const ruleStatuses = await getRuleStatusSavedObjects({
    alertId,
    ruleStatusClient,
  });
  const currentStatus = await getCurrentStatusSavedObject({
    alertId,
    ruleStatusClient,
    ruleStatuses,
  });

  return {
    goingToRun: async () => {
      await ruleStatusClient.update(currentStatus.id, {
        ...currentStatus.attributes,
        ...buildRuleStatusAttributes('going to run'),
      });
    },
    success: async (message, attributes) => {
      await ruleStatusClient.update(currentStatus.id, {
        ...currentStatus.attributes,
        ...buildRuleStatusAttributes('succeeded', message, attributes),
      });
    },
    error: async (message, attributes) => {
      const failureAttributes = {
        ...currentStatus.attributes,
        ...buildRuleStatusAttributes('failed', message, attributes),
      };

      // We always update the newest status, so to 'persist' a failure we push a copy to the head of the list
      await ruleStatusClient.update(currentStatus.id, failureAttributes);
      const newStatusSO = await ruleStatusClient.create(failureAttributes);

      // drop oldest failures
      const oldStatuses = [newStatusSO, ...ruleStatuses.saved_objects].slice(MAX_RULE_STATUSES);
      await Promise.all(oldStatuses.map(status => ruleStatusClient.delete(status.id)));
    },
  };
};
