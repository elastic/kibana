import { uiRegistry } from 'ui/registry/_registry';

export const SavedObjectRegistryProvider = uiRegistry({
  name: 'savedObjects',
  index: ['loaderProperties.name'],
  order: ['loaderProperties.name']
});
