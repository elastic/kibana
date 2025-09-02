/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatInternalService } from './services';
import type { OnechatServicesContext } from './application/context/onechat_services_context';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface OnechatSetupDependencies {
  spaces: SpacesPluginSetup;
}

export interface OnechatStartDependencies {}

export interface OnechatPluginSetup {}

export interface OnechatPluginStart {
  OnechatConversationsView: React.ComponentType;
  internalServices: OnechatInternalService;
}

export type { OnechatServicesContext };
