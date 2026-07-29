/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdatedMetricState } from '../../../../../common/content_management/v1/transforms/metric';
import { removeLegacyTitleWeight } from './remove_legacy_title_weight';
import { convertApplyColorTo } from './apply_color_to';
import { convertDensity } from './density';

export const getRuntimeConverters = () => [
  // v1 CM transform (idempotent): secondaryPrefix/secondaryLabel → secondaryNameVisibility
  // (content-management migration copies custom label text onto the secondary column;
  // runtime conversion keeps it as a legacy render fallback for by-value state),
  // valuesTextAlign → primaryAlign/secondaryAlign
  getUpdatedMetricState,
  removeLegacyTitleWeight,
  convertApplyColorTo,
  convertDensity,
];
