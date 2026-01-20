/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneralDatasourceStates, XYState } from '@kbn/lens-common';

import { convertXYToRawColorMappings } from '../../../../../common/content_management/v1/transforms/raw_color_mappings/xy';
import { convertXYToLegendStats } from '../../../../../common/content_management/v1/transforms/legend_stats/xy';
import { convertToSplitAccessorsFn } from '../../../../../common/content_management/v2/transforms/split_accessors/xy';

export const getRuntimeConverters = (datasourceStates?: Readonly<GeneralDatasourceStates>) => [
  // v1
  convertXYToLegendStats,
  (state: XYState) => convertXYToRawColorMappings(state, datasourceStates),
  // v2
  convertToSplitAccessorsFn,
];
