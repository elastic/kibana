import UiBundle from './ui_bundle';
import appEntryTemplate from './app_entry_template';
import { transform, pluck } from 'lodash';
import { promisify } from 'bluebird';
import { makeRe } from 'minimatch';

const mkdirp = promisify(require('mkdirp'));

class UiBundleCollection {
  constructor(bundlerEnv, filter) {
    this.each = [];
    this.env = bundlerEnv;
    this.filter = makeRe(filter || '*', {
      noglobstar: true,
      noext: true,
      matchBase: true
    });
  }

  add(bundle) {
    if (!(bundle instanceof UiBundle)) {
      throw new TypeError('expected bundle to be an instance of UiBundle');
    }

    if (this.filter.test(bundle.id)) {
      this.each.push(bundle);
    }
  }

  addApp(app) {
    this.add(new UiBundle({
      id: app.id,
      modules: app.getModules(),
      template: appEntryTemplate,
      env: this.env
    }));
  }

  desc() {
    switch (this.each.length) {
      case 0:
        return '0 bundles';
      case 1:
        return `bundle for ${this.each[0].id}`;
      default:
        const ids = this.getIds();
        const last = ids.pop();
        const commas = ids.join(', ');
        return `bundles for ${commas} and ${last}`;
    }
  }

  async ensureDir() {
    await mkdirp(this.env.workingDir);
  }

  async writeEntryFiles() {
    await this.ensureDir();

    for (const bundle of this.each) {
      const existing = await bundle.readEntryFile();
      const expected = bundle.renderContent();

      if (existing !== expected) {
        await bundle.writeEntryFile();
        await bundle.clearBundleFile();
      }
    }
  }

  async getInvalidBundles() {
    const invalids = new UiBundleCollection(this.env);

    for (const bundle of this.each) {
      const exists = await bundle.checkForExistingOutput();
      if (!exists) {
        invalids.add(bundle);
      }
    }

    return invalids;
  }

  toWebpackEntries() {
    return transform(this.each, function (entries, bundle) {
      entries[bundle.id] = bundle.entryPath;
    }, {});
  }

  getIds() {
    return pluck(this.each, 'id');
  }

  toJSON() {
    return this.each;
  }
}

module.exports = UiBundleCollection;
