/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { ToolServiceStartContract } from '@kbn/onechat-browser';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface OnechatSetupDependencies {
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
  uiActions: UiActionsSetup;
}

export interface OnechatStartDependencies {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  cloud: CloudStart;
  share: SharePluginStart;
  uiActions: UiActionsStart;
}

export interface OnechatPluginSetup {}

/**
 * Public start contract for the browser-side onechat plugin.
 */
export interface OnechatPluginStart {
  /**
   * Tool service contract, can be used to list or execute tools.
   */
  tools: ToolServiceStartContract;
}
