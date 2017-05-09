import { uiRegistry } from 'ui/registry/_registry';
export const EditorTypesRegistyProvider = uiRegistry({
  name: 'editorTypes',
  index: ['name'],
  order: ['title']
});
