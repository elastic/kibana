import _ from 'lodash';
import { uiRegistry } from 'ui/registry/_registry';

export const DocViewsRegistryProvider = uiRegistry({
  name: 'docViews',
  index: ['name'],
  order: ['order'],
  constructor() {
    this.forEach(docView => {
      docView.shouldShow = docView.shouldShow || _.constant(true);
      docView.name = docView.name || docView.title;
    });
  }
});
