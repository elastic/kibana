import { uiRegistry } from './_registry';

export const VisEditorTypesRegistryProvider = uiRegistry({
  name: 'visEditorTypes',
  index: ['name'],
  order: ['title']
});
