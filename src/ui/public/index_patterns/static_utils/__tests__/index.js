import expect from 'expect.js';
import { getFieldByName, isFilterable } from '../index';

describe('static utils', () => {
  describe('getFieldByName', () => {
    it('should return the correct field', () => {
      expect(
        getFieldByName(
          [
            { name: 'a' },
            { name: 'b' },
            { name: 'c' },
            { name: 'd' },
            { name: 'e' },
            { name: 'f' },
            { name: 'g' },
          ],
          'c'
        )
      ).to.eql({ name: 'c' });
    });
  });

  describe('isFilterable', () => {
    it('should be filterable', () => {
      ['string', 'number', 'date', 'ip', 'boolean'].forEach(type => {
        expect(isFilterable({ type })).to.be(true);
      });
    });

    it('should not be filterable', () => {
      [
        'geo_point',
        'geo_shape',
        'attachment',
        'murmur3',
        '_source',
        'unknown',
        'conflict',
      ].forEach(type => {
        expect(isFilterable({ type })).to.be(false);
      });
    });
  });
});
