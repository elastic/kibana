import { uiRegistry } from './_registry';

export const SpyModesRegistryProvider = uiRegistry({
  name: 'spyModes',
  index: ['name'],
  order: ['order']
});
