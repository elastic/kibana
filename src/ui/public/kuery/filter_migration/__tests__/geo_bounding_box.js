import _ from 'lodash';
import expect from 'expect.js';
import { convertGeoBoundingBox } from '../geo_bounding_box';

describe('filter to kuery migration', function () {

  describe('geo_bounding_box filter', function () {

    it('should return a kuery node equivalent to the given filter', function () {
      const filter = {
        meta: {
          type: 'geo_bounding_box',
          key: 'foo',
          params: {
            topLeft: {
              lat: 10,
              lon: 20,
            },
            bottomRight: {
              lat: 30,
              lon: 40,
            },
          },
        }
      };
      const result = convertGeoBoundingBox(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'geoBoundingBox');

      const { arguments: [ { value: fieldName }, ...args ] } = result;
      expect(fieldName).to.be('foo');

      const argByName = _.mapKeys(args, 'name');
      expect(argByName.topLeft.value.value).to.be('10, 20');
      expect(argByName.bottomRight.value.value).to.be('30, 40');
    });

    it('should throw an exception if the given filter is not of type "geo_bounding_box"', function () {
      const filter = {
        meta: {
          type: 'foo'
        }
      };

      expect(convertGeoBoundingBox).withArgs(filter).to.throwException(
        /Expected filter of type "geo_bounding_box", got "foo"/
      );
    });

  });

});
