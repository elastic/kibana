import { uiRegistry } from 'ui/registry/_registry';

export const EmbeddableHandlersRegistryProvider = uiRegistry({
  name: 'embeddableHandlers',
  index: ['name'],
  order: ['title']
});
