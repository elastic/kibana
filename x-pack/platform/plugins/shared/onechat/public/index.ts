/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
  ConfigSchema,
} from './types';
import { OnechatPlugin } from './plugin';

export type { OnechatPluginSetup, OnechatPluginStart };
export { OnechatServicesContext } from './application/context/onechat_services_context';
export { OnechatConversationsView } from './application/components/conversations/conversations_view';
export { ConversationsFlyout } from './application/components/conversations/conversations_flyout';
export type { ConversationsFlyoutProps } from './application/components/conversations/conversations_flyout';
export { ConversationsNavLink } from './application/components/conversations/conversations_nav_link';
export type { ConversationsNavLinkProps } from './application/components/conversations/conversations_nav_link';

export const plugin: PluginInitializer<
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) => {
  return new OnechatPlugin(pluginInitializerContext);
};
