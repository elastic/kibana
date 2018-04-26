import { uiRegistry } from './_registry';

export const DevToolsRegistryProvider = uiRegistry({
  name: 'devTools',
  index: ['name'],
  order: ['order']
});

