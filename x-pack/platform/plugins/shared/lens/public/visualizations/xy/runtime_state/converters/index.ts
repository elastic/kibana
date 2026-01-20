/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneralDatasourceStates } from '@kbn/lens-common';
import { convertToLegendStats } from './legend_stats';
import { convertToRawColorMappingsFn } from './raw_color_mappings';
import { convertToSplitAccessorsFn } from './split_accessors';

export const getRuntimeConverters = (datasourceStates?: Readonly<GeneralDatasourceStates>) => [
  // splitAccessors runtime migration needs to run before the color mapping one due to the
  // used `splitAccessors` prop required by the color mapping runtime convertion
  convertToSplitAccessorsFn,
  convertToLegendStats,
  convertToRawColorMappingsFn(datasourceStates),
];
