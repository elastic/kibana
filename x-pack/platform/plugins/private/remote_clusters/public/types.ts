/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementSetup } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { I18nStart } from '@kbn/core/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';

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
