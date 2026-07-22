/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CreateEditEsqlViewFlyoutProps } from './create_edit_view_flyout';

export interface SetupDependencies {
  management: ManagementSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
}

/**
 * Public contract consumed by other plugins (e.g. Discover) that want to open the create/edit
 * ES|QL view flyout from their own entry points, instead of navigating into this plugin's own
 * Stack Management page.
 *
 * Always resolves to the V2 flyout (see `create_edit_view_flyout_v2.tsx`) -- the internal
 * V1/V2/V3 prototype switcher only applies to this plugin's own Stack Management page.
 */
export interface EsqlViewsPublicStart {
  CreateEsqlViewFlyout: ComponentType<CreateEditEsqlViewFlyoutProps>;
}
