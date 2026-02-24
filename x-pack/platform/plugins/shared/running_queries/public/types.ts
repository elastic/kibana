/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export interface RunningQueriesSetupDependencies {
  management: ManagementSetup;
}

export interface RunningQueriesStartDependencies {
  share: SharePluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RunningQueriesPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RunningQueriesPluginStart {}
