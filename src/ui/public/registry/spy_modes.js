import { uiRegistry } from 'ui/registry/_registry';

export const SpyModesRegistryProvider = uiRegistry({
  name: 'spyModes',
  index: ['name'],
  order: ['order']
});
