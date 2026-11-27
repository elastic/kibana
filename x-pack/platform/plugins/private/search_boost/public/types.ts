/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, MouseEvent } from 'react';
import type {
  DatastreamFlyoutProps,
  IndexManagementLocatorParams,
  IndexManagementPluginStart,
} from '@kbn/index-management-shared-types';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { LocatorPublic, SharePluginStart } from '@kbn/share-plugin/public';

export interface SearchBoostSetupDependencies {
  management: ManagementSetup;
}

export interface SearchBoostStartDependencies {
  indexManagement: IndexManagementPluginStart;
  share: SharePluginStart;
}

export interface IndexManagementServices {
  locator: LocatorPublic<IndexManagementLocatorParams>;
  DataStreamFlyout: FC<DatastreamFlyoutProps>;
}

export interface LinkProps {
  href: string;
  onClick: (event: MouseEvent) => void;
}
