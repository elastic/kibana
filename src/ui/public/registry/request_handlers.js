import { uiRegistry } from 'ui/registry/_registry';
export const RequestHandlersRegistryProvider = uiRegistry({
  name: 'requestHandlers',
  index: ['name'],
  order: ['title']
});
