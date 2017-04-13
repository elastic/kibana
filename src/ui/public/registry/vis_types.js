import { uiRegistry } from 'ui/registry/_registry';

export const VisTypesRegistryProvider = uiRegistry({
  name: 'visTypes',
  index: ['name'],
  order: ['title']
});

// Used in x-pack. TODO: switch to named and remove.
export default VisTypesRegistryProvider;
