/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTEXT_MENU_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/embeddable-plugin/common';
import { IMAGE_CLICK_TRIGGER } from '@kbn/image-embeddable-plugin/common';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-browser';

// Do not change constant value - part of public REST API
export const URL_DRILLDOWN_TYPE = 'url_drilldown';

// Only additive changes are allowed, part of public REST API
export const URL_DRILLDOWN_SUPPORTED_TRIGGERS = [
  VALUE_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
  ROW_CLICK_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  IMAGE_CLICK_TRIGGER,
];

export const DEFAULT_ENCODE_URL = true;
export const DEFAULT_OPEN_IN_NEW_TAB = true;
