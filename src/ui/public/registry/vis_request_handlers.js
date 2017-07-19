import { uiRegistry } from 'ui/registry/_registry';
export const VisRequestHandlersRegistryProvider = uiRegistry({
  name: 'visRequestHandlers',
  index: ['name'],
  order: ['title']
});
