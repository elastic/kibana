import expect from 'expect.js';
import { isFilterable } from '../index';

describe('static utils', () => {
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
