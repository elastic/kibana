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
      listed,
      templateName = 'ui_app',
      injectVars,
      url = `/app/${id}`,
      uses = []
    } = spec;

    if (!id) {
      throw new Error('Every app must specify an id');
    }

    this._id = id;
    this._main = main;
    this._title = title;
    this._order = order;
    this._description = description;
    this._icon = icon;
    this._linkToLastSubUrl = linkToLastSubUrl;
    this._hidden = hidden;
    this._listed = listed;
    this._templateName = templateName;
    this._url = url;
    this._injectedVarsProvider = injectVars;
    this._pluginId = pluginId;
    this._kbnServer = kbnServer;

    if (this._pluginId && !this._getPlugin()) {
      throw new Error(`Unknown plugin id "${this._pluginId}"`);
    }

    const { appExtensions = [] } = kbnServer.uiExports;
    this._modules = []
      .concat(this._main, ...uses.map(type => appExtensions[type] || []))
      .filter(Boolean)
      .reduce((modules, item) => (
        modules.includes(item)
          ? modules
          : modules.concat(item)
      ), []);

    if (!this.isHidden()) {
      // unless an app is hidden it gets a navlink, but we only respond to `getNavLink()`
      // if the app is also listed. This means that all apps in the kibanaPayload will
      // have a navLink property since that list includes all normally accessible apps
      this._navLink = new UiNavLink(kbnServer.config.get('server.basePath'), {
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
    const plugin = this._getPlugin();
    return plugin ? plugin.id : undefined;
  }

  getTemplateName() {
    return this._templateName;
  }

  isHidden() {
    return !!this._hidden;
  }

  isListed() {
    return (
      !this.isHidden() &&
      (this._listed == null || !!this._listed)
    );
  }

  getNavLink() {
    if (this.isListed()) {
      return this._navLink;
    }
  }

  getInjectedVars() {
    const provider = this._injectedVarsProvider;
    const plugin = this._getPlugin();

    if (!provider) {
      return;
    }

    return provider.call(
      plugin,
      plugin
        ? plugin.getServer()
        : this._kbnServer.server,
      plugin
        ? plugin.getOptions()
        : undefined
    );
  }

  getModules() {
    return this._modules;
  }

  _getPlugin() {
    const pluginId = this._pluginId;
    const { plugins } = this._kbnServer;

    return pluginId
      ? plugins.find(plugin => plugin.id === pluginId)
      : undefined;
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
