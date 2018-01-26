import expect from 'expect.js';

import { UiBundle } from '../ui_bundle';

describe('ui bundles / UiBundle', () => {
  describe('#getRequires', () => {
    it('returns modules option as a list of require calls', () => {
      const bundle = new UiBundle({
        modules: [
          'a',
          'b',
          'c'
        ]
      });

      expect(bundle.getRequires()).to.eql([
        `require('a');`,
        `require('b');`,
        `require('c');`,
      ]);
    });

    it('does not sort modules', () => {
      const bundle = new UiBundle({
        modules: [
          'c',
          'a',
          'b'
        ]
      });

      expect(bundle.getRequires()).to.eql([
        `require('c');`,
        `require('a');`,
        `require('b');`,
      ]);
    });

    it('converts \\ to /', () => {
      const bundle = new UiBundle({
        modules: [
          'a\\b\\c',
          'd/e/f',
        ]
      });

      expect(bundle.getRequires()).to.eql([
        `require('a/b/c');`,
        `require('d/e/f');`,
      ]);
    });
  });
});
