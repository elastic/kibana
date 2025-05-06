/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreTheme } from '@kbn/core/public';
import { GeneralDatasourceStates } from '../../../../state_management';
import { convertToRawColorMappingsFn } from './raw_color_mappings';
import { convertPaletteToColorMappingConfigFn } from './palette_to_color_mapping_config';

export const getRuntimeConverters = (
  theme: CoreTheme,
  datasourceStates?: Readonly<GeneralDatasourceStates>
) => [convertToRawColorMappingsFn(datasourceStates), convertPaletteToColorMappingConfigFn(theme)];
