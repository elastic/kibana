import { uiRegistry } from 'ui/registry/_registry';
export const VisResponseHandlersRegistryProvider = uiRegistry({
  name: 'visResponseHandlers',
  index: ['name'],
  order: ['title']
});
