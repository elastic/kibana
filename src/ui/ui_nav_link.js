import { pick } from 'lodash';
import { join } from 'path';

export default class UiNavLink {
  constructor(uiExports, spec) {
    this.title = spec.title;
    this.order = spec.order || 0;
    this.url = `${uiExports.urlBasePath || ''}${spec.url}`;
    this.description = spec.description;
    this.icon = spec.icon;
  }

  toJSON() {
    return pick(this, ['title', 'url', 'order', 'description', 'icon']);
  }
}
