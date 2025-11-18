/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { BreadcrumbService } from './application/services/breadcrumbs';

export interface CloudDataMigrationPluginSetup {
  cloud: CloudSetup;
  management: ManagementSetup;
  breadcrumbService: BreadcrumbService;
}

export interface CloudDataMigrationPluginStart {
  cloud?: CloudStart;
}
