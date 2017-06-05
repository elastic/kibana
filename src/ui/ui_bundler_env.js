import { fromRoot } from '../utils';
import { includes } from 'lodash';

const arr = v => [].concat(v || []);

module.exports = class UiBundlerEnv {
  constructor(workingDir) {

    // the location that bundle entry files and all compiles files will
    // be written
    this.workingDir = workingDir;

    // the context that the bundler is running in, this is not officially
    // used for anything but it is serialized into the entry file to ensure
    // that they are invalidated when the context changes
    this.context = {};

    // the plugins that are used to build this environment
    // are tracked and embedded into the entry file so that when the
    // environment changes we can rebuild the bundles
    this.pluginInfo = [];

    // regular expressions which will prevent webpack from parsing the file
    this.noParse = [
      /node_modules[\/\\](angular|elasticsearch-browser)[\/\\]/,
      /node_modules[\/\\](mocha|moment)[\/\\]/
    ];

    // webpack aliases, like require paths, mapping a prefix to a directory
    this.aliases = {
      ui: fromRoot('src/ui/public'),
      test_harness: fromRoot('src/test_harness/public'),
      querystring: 'querystring-browser',
    };

    // map of which plugins created which aliases
    this.aliasOwners = {};

    // loaders that are applied to webpack modules after all other processing
    // NOTE: this is intentionally not exposed as a uiExport because it leaks
    // too much of the webpack implementation to plugins, but is used by test_bundle
    // core plugin to inject the instrumentation loader
    this.postLoaders = [];
  }

  consumePlugin(plugin) {
    const tag = `${plugin.id}@${plugin.version}`;
    if (includes(this.pluginInfo, tag)) return;

    if (plugin.publicDir) {
      this.aliases[`plugins/${plugin.id}`] = plugin.publicDir;
    }

    this.pluginInfo.push(tag);
  }

  exportConsumer(type) {
    switch (type) {
      case 'noParse':
        return (plugin, spec) => {
          for (const re of arr(spec)) this.addNoParse(re);
        };

      case '__globalImportAliases__':
        return (plugin, spec) => {
          for (const key of Object.keys(spec)) {
            this.aliases[key] = spec[key];
          }
        };
    }
  }

  addContext(key, val) {
    this.context[key] = val;
  }

  addPostLoader(loader) {
    this.postLoaders.push(loader);
  }

  addNoParse(regExp) {
    this.noParse.push(regExp);
  }
};
