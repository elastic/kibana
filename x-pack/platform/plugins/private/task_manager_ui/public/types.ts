/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';

export interface TaskManagerUiSetupDependencies {
  management: ManagementSetup;
}

export interface TaskManagerUiStartDependencies {
  data: DataPublicPluginStart;
}
