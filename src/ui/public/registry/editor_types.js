import { uiRegistry } from 'ui/registry/_registry';

export const EditorTypesRegistryProvider = uiRegistry({
  name: 'editorTypes',
  index: ['name'],
  order: ['title']
});
