/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES_EXTENSION_ID } from '@kbn/core/server';
import type { RawRule } from '../types';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { updateMissingUiamKeyTag } from '../rules_client/common/api_key_as_alert_attributes';
import type { RuleData } from './rule_loader';
import type { TaskRunnerContext } from './types';

export const updateRuleMissingUiamKeyTag = async (
  context: TaskRunnerContext,
  ruleId: string,
  spaceId: string,
  ruleData: RuleData
): Promise<RuleData> => {
  const tags = updateMissingUiamKeyTag(
    ruleData.rawRule.tags,
    ruleData.rawRule.uiamApiKey,
    context.isServerless,
    context.shouldGrantUiam,
    context.apiKeyType
  );

  if (tags === ruleData.rawRule.tags) {
    return ruleData;
  }

  const rawRule = { ...ruleData.rawRule, tags };
  const savedObjectsClient = context.savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    excludedExtensions: [SPACES_EXTENSION_ID],
  });
  const updatedSavedObject = await savedObjectsClient.update<RawRule>(
    RULE_SAVED_OBJECT_TYPE,
    ruleId,
    rawRule,
    {
      mergeAttributes: false,
      namespace: context.spaceIdToNamespace(spaceId),
      version: ruleData.version,
    }
  );

  return {
    ...ruleData,
    version: updatedSavedObject.version,
    rawRule,
  };
};
