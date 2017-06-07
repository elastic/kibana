import { uiRegistry } from 'ui/registry/_registry';
export const ResponseHandlersRegistryProvider = uiRegistry({
  name: 'responseHandlers',
  index: ['name'],
  order: ['title']
});
