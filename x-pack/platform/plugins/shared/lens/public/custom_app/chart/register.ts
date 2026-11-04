/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerCapability } from '@kbn/custom-app-registry';
import { lensChartCapability } from '../../../common/custom_app/chart/manifest';

/** Adds the Lens chart to what custom apps can be made of. */
export const registerLensChart = (): void =>
  registerCapability(lensChartCapability, () =>
    import('./view').then(({ LensChartView }) => ({ default: LensChartView }))
  );
