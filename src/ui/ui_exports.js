import _ from 'lodash';
import minimatch from 'minimatch';

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

  extendAliases(alias, moduleOrModules) {
    this.aliases[alias] = _.union(this.aliases[alias] || [], arr(moduleOrModules));
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
          for (const spec of arr(spec)) {
            const app = this.apps.new(_.defaults({}, spec, {
              id: plugin.id,
              urlBasePath: this.urlBasePath
            }));
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
          this.extendAliases(type, spec);
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
              this.extendAliases(adhocAlias, spec[adhocAlias]);
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
