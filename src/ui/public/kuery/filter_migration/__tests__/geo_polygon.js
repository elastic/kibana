import expect from 'expect.js';
import { convertGeoPolygon } from '../geo_polygon';

describe('filter to kuery migration', function () {

  describe('geo_polygon filter', function () {

    it('should return a kuery node equivalent to the given filter', function () {
      const filter = {
        meta: {
          type: 'geo_polygon',
          key: 'foo',
          params: {
            points: [
              {
                lat: 10,
                lon: 20,
              },
              {
                lat: 30,
                lon: 40,
              },
            ]
          }
        }
      };
      const result = convertGeoPolygon(filter);

      expect(result).to.have.property('type', 'function');
      expect(result).to.have.property('function', 'geoPolygon');

      const { arguments: [ { value: fieldName }, ...args ] } = result;
      expect(fieldName).to.be('foo');

      expect(args[0].value).to.be('10, 20');
      expect(args[1].value).to.be('30, 40');
    });

    it('should throw an exception if the given filter is not of type "geo_polygon"', function () {
      const filter = {
        meta: {
          type: 'foo'
        }
      };

      expect(convertGeoPolygon).withArgs(filter).to.throwException(
        /Expected filter of type "geo_polygon", got "foo"/
      );
    });

  });

});
