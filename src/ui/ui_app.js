import _ from 'lodash';
import { join } from 'path';

class UiApp {
  constructor(uiExports, spec) {
    this.uiExports = uiExports;
    this.spec = spec || {};

    this.id = this.spec.id;
    if (!this.id) {
      throw new Error('Every app must specify it\'s id');
    }

    this.main = this.spec.main;
    this.title = this.spec.title;
    this.description = this.spec.description;
    this.icon = this.spec.icon;
    this.hidden = this.spec.hidden;
    this.templateName = this.spec.templateName || 'ui_app';
    this.url = `${spec.urlBasePath || ''}${this.spec.url || `/app/${this.id}`}`;

    if (this.spec.autoload) {
      console.warn(
        `"autoload" (used by ${this.id} app) is no longer a valid app configuration directive.` +
        'Use the \`ui/autoload/*\` modules instead.'
      );
    }

    // once this resolves, no reason to run it again
    this.getModules = _.once(this.getModules);

    // variables that are injected into the browser, must serialize to JSON
    this.getInjectedVars = this.spec.injectVars || _.noop;
  }

  getModules() {
    return _.chain([
      this.uiExports.find(_.get(this, 'spec.uses', [])),
      this.uiExports.find(['chromeNavControls', 'hacks']),
    ])
    .flatten()
    .uniq()
    .unshift(this.main)
    .value();
  }

  toJSON() {
    return _.pick(this, ['id', 'title', 'description', 'icon', 'main', 'url']);
  }
}

module.exports = UiApp;
