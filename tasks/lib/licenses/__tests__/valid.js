import { resolve } from 'path';

import expect from 'expect.js';

import { assertLicensesValid } from '../valid';

const NODE_MODULES = resolve(__dirname, '../../../../node_modules');

const PACKAGE = {
  name: '@elastic/httpolyglot',
  version: '0.1.2-elasticpatch1',
  licenses: ['MIT'],
  directory: resolve(NODE_MODULES, '@elastic/httpolyglot'),
  relative: 'node_modules/@elastic/httpolyglot',
};

describe('tasks/lib/licenses', () => {
  describe('assertLicensesValid()', () => {
    it('returns undefined when package has valid license', () => {
      expect(assertLicensesValid({
        packages: [PACKAGE],
        validLicenses: [...PACKAGE.licenses]
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
