define(function (require) {
  var _ = require('lodash');
  var flattenSearchResponse = require('components/index_patterns/_flatten_search_response');
  describe('IndexPattern#flattenSearchResponse()', function () {

    var indexPattern = {
      fields: {
        byName: {
          'message': { type: 'string' },
          'geo.coordinates': { type: 'geo_point' },
          'geo.dest': { type: 'string' },
          'geo.src': { type: 'string' },
          'bytes': { type: 'number' },
          '@timestamp': { type: 'date' }
        }
      }
    };

    indexPattern.flattenSearchResponse = _.bind(flattenSearchResponse, indexPattern);

    var fixture = {
      message: 'Hello World',
      geo: {
        coordinates: { lat: 33.4500, lon: 112.0667 },
        dest: 'US',
        src: 'IN'
      },
      bytes: 10039103,
      '@timestamp': (new Date()).toString(),
      tags: [{ text: 'foo' }, { text: 'bar' }],
      noMapping: true
    };

    it('should flatten keys as far down as the mapping goes', function () {
      var obj = indexPattern.flattenSearchResponse(fixture);
      expect(obj).to.have.property('geo.coordinates', fixture.geo.coordinates);
      expect(obj).to.not.have.property('geo.coordinates.lat');
      expect(obj).to.not.have.property('geo.coordinates.lon');
      expect(obj).to.have.property('geo.dest', 'US');
      expect(obj).to.have.property('geo.src', 'IN');
      expect(obj).to.have.property('@timestamp', fixture['@timestamp']);
      expect(obj).to.have.property('message', 'Hello World');
      expect(obj).to.have.property('bytes', 10039103);
    });

    it('should flatten keys not in the mapping', function () {
      var obj = indexPattern.flattenSearchResponse(fixture);
      expect(obj).to.have.property('noMapping', true);
    });

    it('should preserve objects in arrays', function () {
      var obj = indexPattern.flattenSearchResponse(fixture);
      expect(obj).to.have.property('tags', fixture['tags']);
    });
  });
});
