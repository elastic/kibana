import { createHash } from 'crypto';
import { resolve } from 'path';

import { UiBundle } from './ui_bundle';
import { fromNode as fcb } from 'bluebird';
import { makeRe } from 'minimatch';
import mkdirp from 'mkdirp';
import { appEntryTemplate } from './app_entry_template';

function getWebpackAliases(pluginSpecs) {
  return pluginSpecs.reduce((aliases, spec) => {
    const publicDir = spec.getPublicDir();

    if (!publicDir) {
      return aliases;
    }

    return {
      ...aliases,
      [`plugins/${spec.getId()}`]: publicDir
    };
  }, {});
}

export class UiBundlesController {
  constructor(kbnServer) {
    const { config, uiApps, uiExports, pluginSpecs } = kbnServer;

    this._workingDir = config.get('optimize.bundleDir');
    this._env = config.get('env.name');
    this._context = {
      env: config.get('env.name'),
      sourceMaps: config.get('optimize.sourceMaps'),
      kbnVersion: config.get('pkg.version'),
      buildNum: config.get('pkg.buildNum'),
      plugins: pluginSpecs
        .map(spec => spec.getId())
        .sort((a, b) => a.localeCompare(b))
    };

    this._filter = makeRe(config.get('optimize.bundleFilter') || '*', {
      noglobstar: true,
      noext: true,
      matchBase: true
    });

    this._webpackAliases = {
      ...getWebpackAliases(pluginSpecs),
      ...uiExports.webpackAliases
    };
    this._webpackPluginProviders = uiExports.webpackPluginProviders;
    this._webpackNoParseRules = uiExports.webpackNoParseRules;
    this._postLoaders = [];
    this._bundles = [];

    for (const uiApp of uiApps) {
      this.add({
        id: uiApp.getId(),
        modules: uiApp.getModules(),
        template: appEntryTemplate,
      });
    }
  }

  add(bundleSpec) {
    const {
      id,
      modules,
      template,
    } = bundleSpec;

    if (this._filter.test(id)) {
      this._bundles.push(new UiBundle({
        id,
        modules,
        template,
        controller: this,
      }));
    }
  }

  getWebpackPluginProviders() {
    return this._webpackPluginProviders || [];
  }

  getWebpackNoParseRules() {
    return this._webpackNoParseRules;
  }

  getWorkingDir() {
    return this._workingDir;
  }

  addPostLoader(loaderSpec) {
    this._postLoaders.push(loaderSpec);
  }

  getPostLoaders() {
    return this._postLoaders;
  }

  getAliases() {
    return this._webpackAliases;
  }

  isDevMode() {
    return this._env === 'development';
  }

  getContext() {
    return JSON.stringify(this._context, null, '  ');
  }

  resolvePath(...args) {
    return resolve(this._workingDir, ...args);
  }

  getCacheDirectory(...subPath) {
    return this.resolvePath('../.cache', this.hashBundleEntries(), ...subPath);
  }

  getDescription() {
    switch (this._bundles.length) {
      case 0:
        return '0 bundles';
      case 1:
        return `bundle for ${this._bundles[0].getId()}`;
      default:
        const ids = this.getIds();
        const last = ids.pop();
        const commas = ids.join(', ');
        return `bundles for ${commas} and ${last}`;
    }
  }

  async ensureDir() {
    await fcb(cb => mkdirp(this._workingDir, cb));
  }

  async writeEntryFiles() {
    await this.ensureDir();

    for (const bundle of this._bundles) {
      const existing = await bundle.readEntryFile();
      const expected = bundle.renderContent();

      if (existing !== expected) {
        await bundle.writeEntryFile();
        await bundle.clearBundleFile();
      }
    }
  }

  async ensureStyleFiles() {
    await this.ensureDir();

    for (const bundle of this._bundles) {
      if (!await bundle.hasStyleFile()) {
        await bundle.touchStyleFile();
      }
    }
  }

  hashBundleEntries() {
    const hash = createHash('sha1');
    for (const bundle of this._bundles) {
      hash.update(`bundleEntryPath:${bundle.getEntryPath()}`);
      hash.update(`bundleEntryContent:${bundle.renderContent()}`);
    }
    return hash.digest('hex');
  }

  async areAllBundleCachesValid() {
    for (const bundle of this._bundles) {
      if (!await bundle.isCacheValid()) {
        return false;
      }
    }

    return true;
  }

  toWebpackEntries() {
    return this._bundles.reduce((entries, bundle) => ({
      ...entries,
      [bundle.getId()]: bundle.getEntryPath(),
    }), {});
  }

  getIds() {
    return this._bundles
      .map(bundle => bundle.getId());
  }

  toJSON() {
    return this._bundles;
  }
}
