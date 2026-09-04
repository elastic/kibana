/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryScope } from '@kbn/change-history-ui';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../../common/saved_object_types';

/** Matches server `RULE_CHANGES_HISTORY_*` scope for UI query keys and telemetry. */
export const RULE_CHANGE_HISTORY_SCOPE: ChangeHistoryScope = {
  module: 'alerting-v2',
  dataset: 'rules',
  objectType: RULE_SAVED_OBJECT_TYPE,
};

export const RULE_CHANGE_HISTORY_STORY_OBJECT_ID = 'rule-bad-weather';
