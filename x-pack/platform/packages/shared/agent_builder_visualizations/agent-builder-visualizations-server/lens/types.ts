/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export type { VisualizationConfig } from './chart_type_registry';

/** How a Lens edit treats existing presentation: focused on the request, or enhanced to defaults. */
export const presentationModeSchema = z.enum(['focused', 'enhance']);

export type PresentationMode = z.infer<typeof presentationModeSchema>;
