import { resolve } from 'path';

import { uniq } from 'lodash';
import expect from 'expect.js';

import { getInstalledPackages } from '../installed_packages';

const KIBANA_ROOT = resolve(__dirname, '../../../../');
const FIXTURE1_ROOT = resolve(__dirname, 'fixtures/fixture1');

describe('tasks/lib/packages', () => {
  describe('getInstalledPackages()', function () {

    let kibanaPackages;
    let fixture1Packages;
    before(async function () {
      this.timeout(30 * 1000);
      [kibanaPackages, fixture1Packages] = await Promise.all([
        getInstalledPackages({
          directory: KIBANA_ROOT
        }),
        getInstalledPackages({
          directory: FIXTURE1_ROOT
        }),
      ]);
    });

    it('requires a directory', async () => {
      try {
        await getInstalledPackages({});
        throw new Error('expected getInstalledPackages() to reject');
      } catch (err) {
        expect(err.message).to.contain('directory');
      }
    });

    it('reads all installed packages of a module', () => {
      expect(fixture1Packages).to.eql([
        {
          name: 'dep1',
          version: '0.0.2',
          licenses: [ 'Apache-2.0' ],
          directory: resolve(FIXTURE1_ROOT, 'node_modules/dep1'),
          relative: 'node_modules/dep1',
        }
      ]);
    });

    it('returns a single entry for every package/version combo', () => {
      const tags = kibanaPackages.map(pkg => `${pkg.name}@${pkg.version}`);
      expect(tags).to.eql(uniq(tags));
    });

    it('does not include root package in the list', async () => {
      expect(kibanaPackages.find(pkg => pkg.name === 'kibana')).to.be(undefined);
      expect(fixture1Packages.find(pkg => pkg.name === 'fixture1')).to.be(undefined);
    });
  });
});
