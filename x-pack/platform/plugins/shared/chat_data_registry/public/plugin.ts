/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart } from './types';
import { DataTypeRegistry } from './services';

export class ChatDataRegistryPlugin
  implements Plugin<ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart>
{
  private readonly dataTypeRegistry = new DataTypeRegistry();

  public setup(core: CoreSetup): ChatDataRegistryPluginSetup {
    // Return methods that should be available to other plugins
    return {
      dataTypeRegistry: {
        register: (descriptor) => this.dataTypeRegistry.register(descriptor),
        list: () => this.dataTypeRegistry.list(),
        clear: () => this.dataTypeRegistry.clear(),
      },
    };
  }

  public start(core: CoreStart): ChatDataRegistryPluginStart {
    return {};
  }

  public stop() {}
}
