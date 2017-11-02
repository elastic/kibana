import { noop } from 'lodash';

import { UiNavLink } from '../ui_nav_links';

export class UiApp {
  constructor(kbnServer, spec) {
    const {
      pluginId,
      id = pluginId,
      main,
      title,
      order = 0,
      description,
      icon,
      hidden,
      linkToLastSubUrl,
      listed = !hidden,
      templateName = 'ui_app',
      injectVars = noop,
      url = `/app/${id}`,
      uses = []
    } = spec;

    if (!id) {
      throw new Error('Every app must specify an id');
    }

    if (spec.autoload) {
      console.warn(
        `"autoload" (used by ${id} app) is no longer a valid app configuration directive.` +
        'Use the \`ui/autoload/*\` modules instead.'
      );
    }

    this._id = id;
    this._main = main;
    this._title = title;
    this._order = order;
    this._description = description;
    this._icon = icon;
    this._linkToLastSubUrl = linkToLastSubUrl;
    this._hidden = hidden;
    this._listed = !hidden && listed;
    this._templateName = templateName;
    this._url = url;
    this._pluginId = pluginId;

    const plugin = kbnServer.plugins
      .find(plugin => plugin.id === this._pluginId);

    this._injectVars = () => {
      if (!injectVars) {
        return;
      }

      const server = plugin.getServer();
      const options = plugin.getOptions();
      return injectVars.call(plugin, server, options);
    };

    const { appExtensions = [] } = kbnServer.uiExports;
    this._modules = [].concat(
      this._main,
      ...uses.map(type => appExtensions[type] || []),
      appExtensions.chromeNavControls || [],
      appExtensions.hacks || []
    );

    if (!this.isHidden()) {
      // unless an app is hidden it gets a navlink, but we only respond to `getNavLink()`
      // if the app is also listed. This means that all apps in the kibanaPayload will
      // have a navLink property since that list includes all normally accessible apps
      this._navLink = new UiNavLink(kbnServer, {
        id: this._id,
        title: this._title,
        order: this._order,
        description: this._description,
        icon: this._icon,
        url: this._url,
        linkToLastSubUrl: this._linkToLastSubUrl
      });
    }
  }

  getId() {
    return this._id;
  }

  getPluginId() {
    return this._pluginId;
  }

  getTemplateName() {
    return this._templateName;
  }

  isHidden() {
    return !!this._hidden;
  }

  getNavLink() {
    if (this._listed) {
      return this._navLink;
    }
  }

  getInjectedVars() {
    return this._injectVars();
  }

  getModules() {
    return this._modules;
  }

  toJSON() {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      icon: this._icon,
      main: this._main,
      navLink: this._navLink,
      linkToLastSubUrl: this._linkToLastSubUrl
    };
  }
}
