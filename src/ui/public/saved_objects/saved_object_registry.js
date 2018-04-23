import { uiRegistry } from '../registry/_registry';

export const SavedObjectRegistryProvider = uiRegistry({
  name: 'savedObjects',
  index: ['loaderProperties.name'],
  order: ['loaderProperties.name']
});
