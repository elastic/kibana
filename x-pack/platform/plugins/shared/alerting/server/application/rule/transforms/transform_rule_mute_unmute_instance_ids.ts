/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import type { BulkUpdateRuleSoParams } from '../../../data/rule';
import type { RawRule } from '../../../saved_objects/schemas/raw_rule';
import type { BulkMuteUnmuteAlertsParams } from '../types';

type InstanceIdCalculator = ({
  existingInstanceIds,
  instanceIdsFromRequest,
}: {
  existingInstanceIds: string[];
  instanceIdsFromRequest: string[];
}) => Pick<RawRule, 'mutedInstanceIds' | 'updatedAt'> | undefined;

export const transformMuteUnmuteRequestToRuleAttributes = ({
  paramRules,
  savedRules,
  instanceIdCalculator,
}: {
  paramRules: BulkMuteUnmuteAlertsParams['rules'];
  savedRules: SavedObjectsBulkResponse<RawRule>['saved_objects'];
  instanceIdCalculator: InstanceIdCalculator;
}) => {
  return (
    paramRules
      .map((paramRule) => {
        const savedRule = savedRules.find((rule) => rule.id === paramRule.id);
        const newAttributes = instanceIdCalculator({
          existingInstanceIds: savedRule?.attributes.mutedInstanceIds ?? [],
          instanceIdsFromRequest: paramRule.alertInstanceIds,
        });

        if (!savedRule || !newAttributes) {
          return;
        }

        return {
          id: savedRule.id,
          attributes: newAttributes,
        };
      })
      // Removing undefined values for rules that did not change
      .filter(Boolean) as BulkUpdateRuleSoParams['rules']
  );
};
