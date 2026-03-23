/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import type { RawRule } from '../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { UiamApiKeyByRuleId } from '../types';

/**
 * Builds the bulk update payload for writing UIAM API keys onto rule saved objects.
 */
export const buildRuleUpdatesForUiam = (
  rulesWithUiamApiKeys: Array<UiamApiKeyByRuleId>
): Array<SavedObjectsBulkUpdateObject<RawRule>> =>
  rulesWithUiamApiKeys.map(({ ruleId, attributes, uiamApiKey, version }) => ({
    type: RULE_SAVED_OBJECT_TYPE,
    id: ruleId,
    attributes: { ...attributes, uiamApiKey },
    version,
    mergeAttributes: false,
  }));
