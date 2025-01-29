/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HasType } from '@kbn/presentation-publishing';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { HasVisualizeConfig } from '@kbn/visualizations-plugin/public';

export type SynchronizeMovementActionApi =
  | HasType<'map' | 'visualization' | 'lens'>
  | Partial<LensApi | HasVisualizeConfig>;
