/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ON_CLICK_VALUE,
  ON_SELECT_RANGE,
  ON_CLICK_ROW,
  ON_OPEN_PANEL_MENU,
  ON_CLICK_IMAGE,
} from '@kbn/ui-actions-plugin/common/trigger_ids';

// Do not change constant value - part of public REST API
export const URL_DRILLDOWN_TYPE = 'url_drilldown';

// Only additive changes are allowed, part of public REST API
export const URL_DRILLDOWN_SUPPORTED_TRIGGERS = [
  ON_CLICK_VALUE,
  ON_SELECT_RANGE,
  ON_CLICK_ROW,
  ON_OPEN_PANEL_MENU,
  ON_CLICK_IMAGE,
];

export const DEFAULT_ENCODE_URL = true;
export const DEFAULT_OPEN_IN_NEW_TAB = true;
