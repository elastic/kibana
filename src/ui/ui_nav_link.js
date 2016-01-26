var _ = require('lodash');
var { join } = require('path');

export default class UiNavLink {
  constructor(uiExports, spec) {
    this.title = spec.title;
    this.order = spec.order || 0;
    this.url = `${uiExports.urlBasePath || ''}${spec.url}`;
    this.description = spec.description;
    this.icon = spec.icon;
  }

  toJSON() {
    return _.pick(this, ['title', 'url', 'order', 'description', 'icon']);
  }
}
