/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { I18nStart } from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';

export interface Dependencies {
  management: ManagementSetup;
  usageCollection: UsageCollectionSetup;
  cloud: CloudSetup;
  share: SharePluginSetup;
  licensing: LicensingPluginStart;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface RequestError {
  message: string;
  cause?: string[];
}

export type { RegisterManagementAppArgs };

export type { I18nStart };
