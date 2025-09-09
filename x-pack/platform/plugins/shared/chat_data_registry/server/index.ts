import type { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ChatDataRegistryPlugin } = await import('./plugin');
  return new ChatDataRegistryPlugin(initializerContext);
}

export type { ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart } from './types';
