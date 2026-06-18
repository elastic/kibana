/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { EMSVectorTileStyleSchema, heatmapStyleSchema, styleSchema } from './style_schemas';

export type EMSVectorTileStyleDescriptor = z.output<typeof EMSVectorTileStyleSchema>;
export type HeatmapStyleDescriptor = z.output<typeof heatmapStyleSchema>;
export type StyleDescriptor = z.output<typeof styleSchema>;
