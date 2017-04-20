import { uiRegistry } from 'ui/registry/_registry';

export const DevToolsRegistryProvider = uiRegistry({
  name: 'devTools',
  index: ['name'],
  order: ['order']
});

export default DevToolsRegistryProvider;
