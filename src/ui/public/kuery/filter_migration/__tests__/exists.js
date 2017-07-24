import expect from 'expect.js';
import { convertExistsFilter } from '../exists';

describe('filter to kuery migration', function () {

  describe('exists filter', function () {

    it('should return a kuery node equivalent to the given filter', function () {
      const filter = {
        meta: {
          type: 'exists',
          key: 'foo',
        }
      };
      const result = convertExistsFilter(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'exists');
      expect(result.arguments[0].value).to.be('foo');
    });

    it('should throw an exception if the given filter is not of type "exists"', function () {
      const filter = {
        meta: {
          type: 'foo'
        }
      };

      expect(convertExistsFilter).withArgs(filter).to.throwException(
        /Expected filter of type "exists", got "foo"/
      );
    });

  });

});
