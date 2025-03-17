/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormBasedPersistedState } from '../../../../datasources/form_based/types';
import { convertToLegendStats } from './legend_stats';
import { convertToRawColorMappingsFn } from './raw_color_mappings';

export const getRuntimeConverters = (datasourceState?: FormBasedPersistedState) => [
  convertToLegendStats,
  convertToRawColorMappingsFn(datasourceState),
];
