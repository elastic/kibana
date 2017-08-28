import _ from 'lodash';
import expect from 'expect.js';
import { convertRangeFilter } from '../range';

describe('filter to kuery migration', function () {

  describe('range filter', function () {

    it('should return a kuery node equivalent to the given filter', function () {
      const filter = {
        meta: {
          type: 'range',
          key: 'foo',
          params: {
            gt: 1000,
            lt: 8000,
          },
        }
      };
      const result = convertRangeFilter(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'range');

      const { arguments: [ { value: fieldName }, ...args ] } = result;
      expect(fieldName).to.be('foo');

      const argByName = _.mapKeys(args, 'name');
      expect(argByName.gt.value.value).to.be(1000);
      expect(argByName.lt.value.value).to.be(8000);
    });

    it('should throw an exception if the given filter is not of type "range"', function () {
      const filter = {
        meta: {
          type: 'foo'
        }
      };

      expect(convertRangeFilter).withArgs(filter).to.throwException(
        /Expected filter of type "range", got "foo"/
      );
    });

  });

});
