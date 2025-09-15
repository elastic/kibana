/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart } from './types';

export class ChatDataRegistryPlugin
  implements Plugin<ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart>
{
  public setup(core: CoreSetup): ChatDataRegistryPluginSetup {
    core.application.register({
      id: 'chatDataRegistry',
      title: 'Chat Data Registry',
      appRoute: '/app/chat-data-registry',
      category: DEFAULT_APP_CATEGORIES.chat,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        return renderApp(params);
      },
    });
    return {};
  }

  public start(core: CoreStart): ChatDataRegistryPluginStart {
    return {};
  }

  public stop() {}
}
