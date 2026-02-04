/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import type { RawRule } from '../../../../../saved_objects/schemas/raw_rule';
import type { BulkMuteUnmuteAlertsParams } from '../../../types';
import { transformMuteUnmuteRequestToRuleAttributes } from '../../../transforms/transform_rule_mute_unmute_instance_ids';

const removeInstanceIds = ({
  existingInstanceIds,
  instanceIdsFromRequest,
}: {
  existingInstanceIds: string[];
  instanceIdsFromRequest: string[];
}): Pick<RawRule, 'mutedInstanceIds' | 'updatedAt'> | undefined => {
  const newMutedInstanceIds = existingInstanceIds.filter(
    (id) => !instanceIdsFromRequest.includes(id)
  );

  if (newMutedInstanceIds.length === existingInstanceIds.length) {
    // No changes needed
    return;
  }

  return {
    mutedInstanceIds: newMutedInstanceIds,
    updatedAt: new Date().toISOString(),
  };
};

export const transformUnmuteRequestToRuleAttributes = ({
  paramRules,
  savedRules,
}: {
  paramRules: BulkMuteUnmuteAlertsParams['rules'];
  savedRules: SavedObjectsBulkResponse<RawRule>['saved_objects'];
}) => {
  return transformMuteUnmuteRequestToRuleAttributes({
    paramRules,
    savedRules,
    instanceIdCalculator: removeInstanceIds,
  });
};
