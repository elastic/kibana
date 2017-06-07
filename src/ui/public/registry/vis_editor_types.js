import { uiRegistry } from 'ui/registry/_registry';

export const VisEditorTypesRegistryProvider = uiRegistry({
  name: 'visEditorTypes',
  index: ['name'],
  order: ['title']
});
