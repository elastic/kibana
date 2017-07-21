import expect from 'expect.js';
import { convertPhraseFilter } from '../phrase';

describe('filter to kuery migration', function () {

  describe('phrase filter', function () {

    it('should return a kuery node equivalent to the given filter', function () {
      const filter = {
        meta: {
          type: 'phrase',
          key: 'foo',
          params: {
            query: 'bar'
          },
        }
      };
      const result = convertPhraseFilter(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'is');

      const { arguments: [ { value: fieldName }, { value: value } ] } = result;
      expect(fieldName).to.be('foo');
      expect(value).to.be('bar');
    });

    it('should throw an exception if the given filter is not of type "phrase"', function () {
      const filter = {
        meta: {
          type: 'foo'
        }
      };

      expect(convertPhraseFilter).withArgs(filter).to.throwException(
        /Expected filter of type "phrase", got "foo"/
      );
    });

  });

});
