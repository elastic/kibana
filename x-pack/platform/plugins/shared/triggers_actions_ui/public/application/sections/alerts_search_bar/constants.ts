/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AlertConsumers } from '@kbn/rule-data-utils';

export const NO_INDEX_PATTERNS: DataView[] = [];
export const ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY = 'searchBarParams';
export const NON_SIEM_CONSUMERS = Object.values(AlertConsumers).filter(
  (fid) => fid !== AlertConsumers.SIEM
);
export const RESET_FILTER_CONTROLS_TEST_SUBJ = 'resetFilterControlsButton';
