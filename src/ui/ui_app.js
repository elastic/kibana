import { chain, get, noop, once, pick } from 'lodash';

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
    this.order = this.spec.order || 0;
    this.description = this.spec.description;
    this.icon = this.spec.icon;
    this.hidden = !!this.spec.hidden;
    this.listed = this.spec.listed == null ? !this.hidden : this.spec.listed;
    this.templateName = this.spec.templateName || 'ui_app';

    if (!this.hidden) {
      // any non-hidden app has a url, so it gets a "navLink"
      this.navLink = this.uiExports.navLinks.new({
        id: this.id,
        title: this.title,
        order: this.order,
        description: this.description,
        icon: this.icon,
        url: this.spec.url || `/app/${this.id}`
      });

      if (!this.listed) {
        // unlisted apps remove their navLinks from the uiExports collection though
        this.uiExports.navLinks.delete(this.navLink);
      }
    }

    if (this.spec.autoload) {
      console.warn(
        `"autoload" (used by ${this.id} app) is no longer a valid app configuration directive.` +
        'Use the \`ui/autoload/*\` modules instead.'
      );
    }

    // once this resolves, no reason to run it again
    this.getModules = once(this.getModules);

    // variables that are injected into the browser, must serialize to JSON
    this.getInjectedVars = this.spec.injectVars || noop;
  }

  getModules() {
    return chain([
      this.uiExports.find(get(this, 'spec.uses', [])),
      this.uiExports.find(['chromeNavControls', 'hacks']),
    ])
    .flatten()
    .uniq()
    .unshift(this.main)
    .value();
  }

  toJSON() {
    return pick(this, ['id', 'title', 'description', 'icon', 'main', 'navLink']);
  }
}

module.exports = UiApp;
