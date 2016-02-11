import _ from 'lodash';
import { join, relative } from 'path';
import minimatch from 'minimatch';

import fromRoot from '../utils/fromRoot';
import UiAppCollection from './ui_app_collection';

function arr(v) {
  return [].concat(v);
}

class UiExports {
  constructor({ urlBasePath }) {
    this.apps = new UiAppCollection(this);
    this.aliases = {};
    this.urlBasePath = urlBasePath;
    this.exportConsumer = _.memoize(this.exportConsumer);
    this.consumers = [];
    this.bundleProviders = [];
  }

  consumePlugin(plugin) {
    plugin.apps = new UiAppCollection(this);

    var types = _.keys(plugin.uiExportsSpecs);
    if (!types) return false;

    var unkown = _.reject(types, this.exportConsumer, this);
    if (unkown.length) {
      throw new Error('unknown export types ' + unkown.join(', ') + ' in plugin ' + plugin.id);
    }

    for (let consumer of this.consumers) {
      consumer.consumePlugin && consumer.consumePlugin(plugin);
    }

    types.forEach((type) => {
      this.exportConsumer(type)(plugin, plugin.uiExportsSpecs[type]);
    });
  }

  addConsumer(consumer) {
    this.consumers.push(consumer);
  }

  // when module ids are defined in a uiExports spec they can
  // be defined as relative to the public directory
  resolveModulePath(plugin, moduleId) {
    const modulePrefix = `plugins/${plugin.id}`;
    const isAbsolute = moduleId.startsWith('/') || moduleId.startsWith('\\');
    const isPrefixed = moduleId.startsWith(modulePrefix);
    const treatRelative = !isAbsolute && !isPrefixed;

    if (treatRelative) return join(modulePrefix, moduleId);
    return moduleId;
  }

  extendAliases(plugin, alias, idOrIds) {
    const existingModuleIds = this.aliases[alias] || [];
    const resolve = id => this.resolveModulePath(plugin, id);
    const resolvedModuleIds = arr(idOrIds).map(resolve);

    this.aliases[alias] = _.union(existingModuleIds, resolvedModuleIds);
  }

  exportConsumer(type) {
    for (const consumer of this.consumers) {
      if (!consumer.exportConsumer) continue;
      const fn = consumer.exportConsumer(type);
      if (fn) return fn;
    }

    switch (type) {
      case 'app':
      case 'apps':
        return (plugin, spec) => {
          for (const rawSpec of arr(spec)) {
            // massage the spec a bit before creating the uiApp
            const spec = _.defaults({}, rawSpec, {
              id: plugin.id,
              urlBasePath: this.urlBasePath
            });

            if (spec.main) spec.main = this.resolveModulePath(plugin, spec.main);
            if (spec.icon) spec.icon = this.resolveModulePath(plugin, spec.icon);

            const app = this.apps.new(spec);
            plugin.apps.add(app);
          }
        };

      case 'visType':
      case 'visTypes':
      case 'fieldFormat':
      case 'fieldFormats':
      case 'spyMode':
      case 'spyModes':
      case 'chromeNavControl':
      case 'chromeNavControls':
      case 'navbarExtension':
      case 'navbarExtensions':
      case 'settingsSection':
      case 'settingsSections':
      case 'docView':
      case 'docViews':
      case 'sledgehammer':
      case 'sledgehammers':
        return (plugin, spec) => {
          this.extendAliases(plugin, type, spec);
        };

      case 'bundle':
      case 'bundles':
        return (plugin, specs) => {
          this.bundleProviders = this.bundleProviders.concat(arr(specs));
        };

      case 'alias':
      case 'aliases':
        return (plugin, specs) => {
          for (const spec of specs) {
            for (const adhocAlias of Object.keys(spec)) {
              this.extendAliases(plugin, adhocAlias, spec[adhocAlias]);
            }
          }
        };
    }
  }

  find(patterns) {
    var aliases = this.aliases;
    var names = _.keys(aliases);
    var matcher = _.partialRight(minimatch.filter, { matchBase: true });

    return _.chain(patterns)
    .map(function (pattern) {
      return names.filter(matcher(pattern));
    })
    .flattenDeep()
    .reduce(function (found, name) {
      return found.concat(aliases[name]);
    }, [])
    .value();
  }

  getAllApps() {
    const { apps } = this;
    return [...apps].concat(...apps.hidden);
  }

  getApp(id) {
    return this.apps.byId[id];
  }

  getHiddenApp(id) {
    return this.apps.hidden.byId[id];
  }

  getBundleProviders() {
    return this.bundleProviders;
  }
}

module.exports = UiExports;
