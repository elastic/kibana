/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdatedMetricState } from '../../../../../common/content_management/v1/transforms/metric';
import { removeLegacyTitleWeight } from './remove_legacy_title_weight';
import { convertApplyColorTo } from './apply_color_to';
import { convertSpacing } from './spacing';

export const getRuntimeConverters = () => [
  // v1 CM transform (idempotent): secondaryPrefix → secondaryLabel, valuesTextAlign → primaryAlign/secondaryAlign
  getUpdatedMetricState,
  removeLegacyTitleWeight,
  convertApplyColorTo,
  convertSpacing,
];
