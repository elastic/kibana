import type { PluginInitializerContext } from '@kbn/core/server';
import { config } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { CckPlugin } = await import('./plugin');
  return new CckPlugin(initializerContext);
}

export { config };

export type { CckPluginSetup, CckPluginStart, CckMultiClient } from './types';
