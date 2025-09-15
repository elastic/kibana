/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { ManagementSetup } from '@kbn/management-plugin/public/types';
import { SharePluginSetup } from '@kbn/share-plugin/server';

export interface Dependencies {
  features: FeaturesPluginSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
}
