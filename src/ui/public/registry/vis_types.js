import { uiRegistry } from './_registry';

export const VisTypesRegistryProvider = uiRegistry({
  name: 'visTypes',
  index: ['name'],
  order: ['title']
});
