import { ChatDataRegistryPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new ChatDataRegistryPlugin();
}
export type { ChatDataRegistryPluginSetup, ChatDataRegistryPluginStart } from './types';
