import expect from 'expect.js';

import { formatListAsProse } from '../prose';

describe('utils formatListAsProse()', () => {
  it('throw TypeError for non array arguments', () => {
    const assertTypeError = error => {
      expect(error).to.be.a(TypeError);
    };

    expect(() => formatListAsProse(0)).to.throwError(assertTypeError);
    expect(() => formatListAsProse(1)).to.throwError(assertTypeError);
    expect(() => formatListAsProse({})).to.throwError(assertTypeError);
    expect(() => formatListAsProse(() => {})).to.throwError(assertTypeError);
    expect(() => formatListAsProse((a, b) => b)).to.throwError(assertTypeError);
    expect(() => formatListAsProse(/foo/)).to.throwError(assertTypeError);
    expect(() => formatListAsProse(null)).to.throwError(assertTypeError);
    expect(() => formatListAsProse(undefined)).to.throwError(assertTypeError);
    expect(() => formatListAsProse(false)).to.throwError(assertTypeError);
    expect(() => formatListAsProse(true)).to.throwError(assertTypeError);
  });

  describe('defaults', () => {
    it('joins items together with "and" and commas', () => {
      expect(formatListAsProse([1, 2])).to.eql('1 and 2');
      expect(formatListAsProse([1, 2, 3])).to.eql('1, 2, and 3');
      expect(formatListAsProse([4, 3, 2, 1])).to.eql('4, 3, 2, and 1');
    });
  });

  describe('inclusive=true', () => {
    it('joins items together with "and" and commas', () => {
      expect(formatListAsProse([1, 2], { inclusive: true })).to.eql('1 and 2');
      expect(formatListAsProse([1, 2, 3], { inclusive: true })).to.eql('1, 2, and 3');
      expect(formatListAsProse([4, 3, 2, 1], { inclusive: true })).to.eql('4, 3, 2, and 1');
    });
  });

  describe('inclusive=false', () => {
    it('joins items together with "or" and commas', () => {
      expect(formatListAsProse([1, 2], { inclusive: false })).to.eql('1 or 2');
      expect(formatListAsProse([1, 2, 3], { inclusive: false })).to.eql('1, 2, or 3');
      expect(formatListAsProse([4, 3, 2, 1], { inclusive: false })).to.eql('4, 3, 2, or 1');
    });
  });
});
