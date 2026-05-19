/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { LicensingPluginStart } from '../types';
import type { FeatureUsageServiceSetup } from '../services';
import type { LicensingRouter } from '../types';
export declare function registerRoutes(
  router: LicensingRouter,
  featureUsageSetup: FeatureUsageServiceSetup,
  getStartServices: StartServicesAccessor<{}, LicensingPluginStart>
): void;
