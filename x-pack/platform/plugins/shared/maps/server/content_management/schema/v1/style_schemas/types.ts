/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { heatmapStyleSchema } from './heatmap_style_schemas';
import { EMSVectorTileStyleSchema } from './ems_style_schemas';

export type EMSVectorTileStyleDescriptor = TypeOf<typeof EMSVectorTileStyleSchema>;
export type HeatmapStyleDescriptor = TypeOf<typeof heatmapStyleSchema>;
