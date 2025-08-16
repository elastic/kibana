/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface OnechatSetupDependencies {
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  uiActions: UiActionsSetup;
}

export interface OnechatStartDependencies {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
}

export interface OnechatPluginSetup {}

export interface OnechatPluginStart {}
