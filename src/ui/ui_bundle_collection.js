let rimraf = promisify(require('rimraf'));
let mkdirp = promisify(require('mkdirp'));
let unlink = promisify(require('fs').unlink);
let readdir = promisify(require('fs').readdir);

import UiBundle from './ui_bundle';
import appEntryTemplate from './app_entry_template';
import { readFileSync as readSync } from 'fs';
import { pull, transform, pluck } from 'lodash';
import { join } from 'path';
import { resolve, promisify } from 'bluebird';
import { makeRe } from 'minimatch';

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
        var ids = this.getIds();
        var last = ids.pop();
        var commas = ids.join(', ');
        return `bundles for ${commas} and ${last}`;
    }
  }

  async ensureDir() {
    await mkdirp(this.env.workingDir);
  }

  async writeEntryFiles() {
    await this.ensureDir();

    for (let bundle of this.each) {
      let existing = await bundle.readEntryFile();
      let expected = bundle.renderContent();

      if (existing !== expected) {
        await bundle.writeEntryFile();
        await bundle.clearBundleFile();
      }
    }
  }

  async getInvalidBundles() {
    let invalids = new UiBundleCollection(this.env);

    for (let bundle of this.each) {
      let exists = await bundle.checkForExistingOutput();
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
