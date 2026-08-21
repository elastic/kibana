/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSecondaryNameVisibility } from './secondary_name_visibility';
import { removeLegacyTitleWeight } from './remove_legacy_title_weight';
import { convertApplyColorTo } from './apply_color_to';
import { convertDensity } from './density';

export const getRuntimeConverters = () => [
  // secondaryPrefix/secondaryLabel → secondaryNameVisibility (keeps a non-empty
  // secondaryLabel as a render fallback until a future CM version), valuesTextAlign →
  // primaryAlign/secondaryAlign
  convertSecondaryNameVisibility,
  removeLegacyTitleWeight,
  convertApplyColorTo,
  convertDensity,
];
