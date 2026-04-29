/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { ALERT_RULE_NAME, AlertConsumers } from '@kbn/rule-data-utils';
import { DEFAULT_CONTROLS } from '@kbn/alerts-ui-shared/src/alert_filter_controls/constants';

export const NO_INDEX_PATTERNS: DataView[] = [];
export const ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY = 'searchBarParams';
export const RULE_DETAILS_ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY = 'ruleDetailsSearchBarParams';
export const RULE_DETAILS_FILTER_CONTROLS_STORAGE_KEY = 'ruleDetailsAlerts';
export const NON_SIEM_CONSUMERS = Object.values(AlertConsumers).filter(
  (fid) => fid !== AlertConsumers.SIEM
);
export const RESET_FILTER_CONTROLS_TEST_SUBJ = 'resetFilterControlsButton';
export const RULE_DETAILS_FILTER_CONTROLS = DEFAULT_CONTROLS.filter(
  (control) => control.field_name !== ALERT_RULE_NAME
);
