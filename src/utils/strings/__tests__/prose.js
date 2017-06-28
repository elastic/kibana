import expect from 'expect.js';

import { formatListAsProse } from '../prose';

describe('utils formatListAsProse()', () => {
  it('converts non array arguments to string', () => {
    expect(formatListAsProse(0)).to.eql('0');
    expect(formatListAsProse(1)).to.eql('1');
    expect(formatListAsProse({})).to.eql('[object Object]');
    expect(formatListAsProse(() => {})).to.eql('() => {}');
    expect(formatListAsProse((a, b) => b)).to.eql('(a, b) => b');
    expect(formatListAsProse(/foo/)).to.eql('/foo/');
    expect(formatListAsProse(null)).to.eql('null');
    expect(formatListAsProse(undefined)).to.eql('undefined');
    expect(formatListAsProse(false)).to.eql('false');
    expect(formatListAsProse(true)).to.eql('true');
  });

  describe('defaults', () => {
    it('joins items together with "and" and commas', () => {
      expect(formatListAsProse([1,2])).to.eql('1 and 2');
      expect(formatListAsProse([1,2,3])).to.eql('1, 2 and 3');
      expect(formatListAsProse([4,3,2,1])).to.eql('4, 3, 2 and 1');
    });
  });

  describe('inclusive=true', () => {
    it('joins items together with "and" and commas', () => {
      expect(formatListAsProse([1,2], { inclusive: true })).to.eql('1 and 2');
      expect(formatListAsProse([1,2,3], { inclusive: true })).to.eql('1, 2 and 3');
      expect(formatListAsProse([4,3,2,1], { inclusive: true })).to.eql('4, 3, 2 and 1');
    });
  });

  describe('inclusive=false', () => {
    it('joins items together with "or" and commas', () => {
      expect(formatListAsProse([1,2], { inclusive: false })).to.eql('1 or 2');
      expect(formatListAsProse([1,2,3], { inclusive: false })).to.eql('1, 2 or 3');
      expect(formatListAsProse([4,3,2,1], { inclusive: false })).to.eql('4, 3, 2 or 1');
    });
  });
});
