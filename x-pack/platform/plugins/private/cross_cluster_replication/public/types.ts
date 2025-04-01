/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { IndexManagementPluginSetup } from '@kbn/index-management-plugin/public';
import { RemoteClustersPluginSetup } from '@kbn/remote-clusters-plugin/public';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/public';

export interface PluginDependencies {
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  indexManagement: IndexManagementPluginSetup;
  remoteClusters: RemoteClustersPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}
