import { uiRegistry } from './_registry';
export const VisRequestHandlersRegistryProvider = uiRegistry({
  name: 'visRequestHandlers',
  index: ['name'],
  order: ['title']
});
