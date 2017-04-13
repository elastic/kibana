import { uiRegistry } from 'ui/registry/_registry';

export const SavedObjectRegistryProvider = uiRegistry({
  name: 'savedObjects',
  index: ['loaderProperties.name'],
  order: ['loaderProperties.name']
});

// Used by x-pack. TODO: convert to named and remove.
export default SavedObjectRegistryProvider;
