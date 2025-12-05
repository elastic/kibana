/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import type { BulkUpdateRuleSoParams } from '../../../../../data/rule/methods/bulk_update_rule_so';
import type { RawRule } from '../../../../../saved_objects/schemas/raw_rule';
import type { BulkMuteUnmuteAlertsParams } from '../../../types';

export const transformMuteRequestToRuleAttributes = ({
  paramRules,
  savedRules,
}: {
  paramRules: BulkMuteUnmuteAlertsParams['rules'];
  savedRules: SavedObjectsBulkResponse<RawRule>['saved_objects'];
}) => {
  return (
    paramRules
      .map((paramRule) => {
        const savedRule = savedRules.find((rule) => rule.id === paramRule.id);
        const newAttributes = mergeInstanceIds({
          alertInstanceIds: savedRule?.attributes.mutedInstanceIds ?? [],
          additionalInstanceIds: paramRule.alertInstanceIds,
        });

        if (!savedRule || !newAttributes) {
          return;
        }

        return {
          id: savedRule.id,
          attributes: newAttributes,
        };
      })
      // Removing undefined (in case all instanceIds are already muted)
      .filter(Boolean) as BulkUpdateRuleSoParams['rules']
  );
};

const mergeInstanceIds = ({
  alertInstanceIds,
  additionalInstanceIds,
}: {
  alertInstanceIds: string[];
  additionalInstanceIds: string[];
}): Pick<RawRule, 'mutedInstanceIds' | 'updatedAt'> | undefined => {
  const newMutedInstanceIds = [...new Set([...alertInstanceIds, ...additionalInstanceIds])];

  if (newMutedInstanceIds.length === alertInstanceIds.length) {
    // No changes needed
    return;
  }

  return {
    mutedInstanceIds: newMutedInstanceIds,
    updatedAt: new Date().toISOString(),
  };
};
