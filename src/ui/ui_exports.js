import _ from 'lodash';
import minimatch from 'minimatch';

import UiAppCollection from './ui_app_collection';
import UiNavLinkCollection from './ui_nav_link_collection';

export default class UiExports {
  constructor({ urlBasePath, kibanaIndexMappings }) {
    this.navLinks = new UiNavLinkCollection(this);
    this.apps = new UiAppCollection(this);
    this.aliases = {
      fieldFormatEditors: ['ui/field_format_editor/register'],
      visRequestHandlers: [
        'ui/vis/request_handlers/courier',
        'ui/vis/request_handlers/none'
      ],
      visResponseHandlers: [
        'ui/vis/response_handlers/basic',
        'ui/vis/response_handlers/none'
      ],
      visEditorTypes: [
        'ui/vis/editors/default/default',
      ],
      embeddableHandlers: [
        'plugins/kibana/visualize/embeddable/visualize_embeddable_handler_provider',
        'plugins/kibana/discover/embeddable/search_embeddable_handler_provider',
      ],
    };
    this.urlBasePath = urlBasePath;
    this.exportConsumer = _.memoize(this.exportConsumer);
    this.consumers = [];
    this.bundleProviders = [];
    this.defaultInjectedVars = {};
    this.injectedVarsReplacers = [];
    this.kibanaIndexMappings = kibanaIndexMappings;
  }

  consumePlugin(plugin) {
    plugin.apps = new UiAppCollection(this);

    const types = _.keys(plugin.uiExportsSpecs);
    if (!types) return false;

    const unkown = _.reject(types, this.exportConsumer, this);
    if (unkown.length) {
      throw new Error('unknown export types ' + unkown.join(', ') + ' in plugin ' + plugin.id);
    }

    for (const consumer of this.consumers) {
      consumer.consumePlugin && consumer.consumePlugin(plugin);
    }

    types.forEach((type) => {
      this.exportConsumer(type)(plugin, plugin.uiExportsSpecs[type]);
    });
  }

  addConsumer(consumer) {
    this.consumers.push(consumer);
  }

  addConsumerForType(typeToConsume, consumer) {
    this.consumers.push({
      exportConsumer(uiExportType) {
        if (uiExportType === typeToConsume) {
          return consumer;
        }
      }
    });
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
        return (plugin, specs) => {
          for (const spec of [].concat(specs || [])) {

            const app = this.apps.new(_.defaults({}, spec, {
              id: plugin.id,
              urlBasePath: this.urlBasePath
            }));

            plugin.extendInit((server, options) => { // eslint-disable-line no-loop-func
              const wrapped = app.getInjectedVars;
              app.getInjectedVars = () => wrapped.call(plugin, server, options);
            });

            plugin.apps.add(app);
          }
        };

      case 'link':
      case 'links':
        return (plugin, specs) => {
          for (const spec of [].concat(specs || [])) {
            this.navLinks.new(spec);
          }
        };

      case 'visTypes':
      case 'visResponseHandlers':
      case 'visRequestHandlers':
      case 'visEditorTypes':
      case 'savedObjectTypes':
      case 'embeddableHandlers':
      case 'fieldFormats':
      case 'fieldFormatEditors':
      case 'spyModes':
      case 'chromeNavControls':
      case 'navbarExtensions':
      case 'managementSections':
      case 'devTools':
      case 'docViews':
      case 'hacks':
        return (plugin, spec) => {
          this.aliases[type] = _.union(this.aliases[type] || [], spec);
        };

      case 'visTypeEnhancers':
        return (plugin, spec) => {
          //used for plugins that augment capabilities of an existing visualization
          this.aliases.visTypes = _.union(this.aliases.visTypes || [], spec);
        };

      case 'bundle':
        return (plugin, spec) => {
          this.bundleProviders.push(spec);
        };

      case 'aliases':
        return (plugin, specs) => {
          _.forOwn(specs, (spec, adhocType) => {
            this.aliases[adhocType] = _.union(this.aliases[adhocType] || [], spec);
          });
        };

      case 'injectDefaultVars':
        return (plugin, injector) => {
          plugin.extendInit(async (server, options) => {
            _.defaults(this.defaultInjectedVars, await injector.call(plugin, server, options));
          });
        };

      case 'mappings':
        return (plugin, mappings) => {
          this.kibanaIndexMappings.addRootProperties(mappings, { plugin: plugin.id });
        };

      case 'replaceInjectedVars':
        return (plugin, replacer) => {
          this.injectedVarsReplacers.push(replacer);
        };
    }
  }

  find(patterns) {
    const aliases = this.aliases;
    const names = _.keys(aliases);
    const matcher = _.partialRight(minimatch.filter, { matchBase: true });

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
