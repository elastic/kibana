/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { CPSServerSetup, CPSServerStart } from '@kbn/cps/server';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type {
  LicensingApiRequestHandlerContext,
  LicensingPluginSetup,
} from '@kbn/licensing-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import type { spaceV1 as v1 } from '../common';

export interface SpacesPluginSetupDeps {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
  cloud?: CloudSetup;
  cps?: CPSServerSetup;
}

export interface SpacesPluginStartDeps {
  features: FeaturesPluginStart;
  cps?: CPSServerStart;
}

/**
 * @internal
 */
export type SpacesRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
}>;

/**
 * @internal
 */
export type SpacesRouter = IRouter<SpacesRequestHandlerContext>;

/**
 * @internal
 */
export type SpaceSavedObjectAttributes = Partial<Omit<v1.Space, 'id' | 'projectRouting'>>;
