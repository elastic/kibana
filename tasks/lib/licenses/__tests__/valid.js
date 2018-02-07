import { resolve } from 'path';

import expect from 'expect.js';

import { assertLicensesValid } from '../valid';

const ROOT = resolve(__dirname, '../../../../');
const NODE_MODULES = resolve(ROOT, './node_modules');

const PACKAGE = {
  name: '@elastic/httpolyglot',
  version: '0.1.2-elasticpatch1',
  licenses: ['MIT'],
  directory: resolve(NODE_MODULES, '@elastic/httpolyglot'),
  relative: 'node_modules/@elastic/httpolyglot',
};

const INTERNAL_PACKAGE = {
  name: '@kbn/internal',
  version: '1.0.0',
  // `license-checker` marks `private: true` packages as "unlicensed" _even_ if
  // you add a `license` field to its `package.json`
  licenses: ['UNLICENSED'],
  directory: resolve(ROOT, 'packages/kbn-internal'),
  relative: 'packages/kbn-internal',
};

describe('tasks/lib/licenses', () => {
  describe('assertLicensesValid()', () => {
    it('returns undefined when package has valid license', () => {
      expect(assertLicensesValid({
        packages: [PACKAGE],
        validLicenses: [...PACKAGE.licenses]
      })).to.be(undefined);
    });

    it('returns undefined if internal package that is marked as "UNLICENSED"', () => {
      expect(assertLicensesValid({
        packages: [INTERNAL_PACKAGE],
        validLicenses: ['MIT', 'Apache-2.0']
      })).to.be(undefined);
    });

    it('throw an error when the packages license is invalid', () => {
      expect(() => {
        assertLicensesValid({
          packages: [PACKAGE],
          validLicenses: [`not ${PACKAGE.licenses[0]}`]
        });
      }).to.throwError(PACKAGE.name);
    });

    it('throws an error when the package has no licenses', () => {
      expect(() => {
        assertLicensesValid({
          packages: [
            {
              ...PACKAGE,
              licenses: []
            }
          ],
          validLicenses: [...PACKAGE.licenses]
        });
      }).to.throwError(PACKAGE.name);
    });

    it('includes the relative path to packages in error message', () => {
      try {
        assertLicensesValid({
          packages: [PACKAGE],
          validLicenses: ['none']
        });
        throw new Error('expected assertLicensesValid() to throw');
      } catch (error) {
        expect(error.message).to.contain(PACKAGE.relative);
        expect(error.message).to.not.contain(PACKAGE.directory);
      }
    });
  });
});
