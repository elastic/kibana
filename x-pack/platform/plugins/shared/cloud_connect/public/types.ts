/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';

// Plugin types
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudConnectedPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudConnectedPluginStart {}

export interface CloudConnectedSetupDeps {
  management: ManagementSetup;
}

// Application types
export interface CloudConnectedAppComponentProps {
  chrome: CoreStart['chrome'];
  application: CoreStart['application'];
  http: CoreStart['http'];
  docLinks: CoreStart['docLinks'];
  notifications: CoreStart['notifications'];
  history: AppMountParameters['history'];
}

export interface ClusterDetails {
  id: string;
  name: string;
  metadata: {
    created_at: string;
    created_by: string;
    organization_id: string;
  };
  self_managed_cluster: {
    id: string;
    name: string;
    version: string;
  };
  license: {
    type: string;
    uid: string;
  };
  services: {
    auto_ops?: {
      enabled: boolean;
      supported: boolean;
      config?: { region_id?: string };
    };
    eis?: {
      enabled: boolean;
      supported: boolean;
      config?: { region_id?: string };
    };
  };
}
