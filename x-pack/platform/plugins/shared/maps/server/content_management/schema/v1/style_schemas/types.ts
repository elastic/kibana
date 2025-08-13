/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { heatmapStyleSchema } from './heatmap_style_schemas';
import { symbolizeAsOptionsSchema } from './vector_style_schemas';
import {
  colorDynamicSchema,
  colorStaticSchema,
  colorStylePropertySchema,
} from './color_schemas';

export type HeatmapStyleDescriptor = TypeOf<typeof heatmapStyleSchema>;

type SymbolizeAsOptions = TypeOf<typeof symbolizeAsOptionsSchema>;
export type StylePropertyOptions = SymbolizeAsOptions;

export type ColorStaticStylePropertyDescriptor = TypeOf<typeof colorStaticSchema>;
export type ColorDynamicStylePropertyDescriptor = TypeOf<typeof colorDynamicSchema>;
export type ColorStylePropertyDescriptor = TypeOf<typeof colorStylePropertySchema>;
