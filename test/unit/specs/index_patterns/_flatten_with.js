define(function (require) {
  var flattenWith = require('components/index_patterns/_flatten_with');
  describe('IndexPattern#flattenWith()', function () {

    var indexPattern = {
      fieldsByName: {
        'message': { type: 'string' },
        'geo.coordinates': { type: 'geo_point' },
        'geo.dest': { type: 'string' },
        'geo.src': { type: 'string' },
        'bytes': { type: 'number' },
        '@timestamp': { type: 'date' }
      }
    };

    indexPattern.flattenWith = flattenWith.bind(indexPattern);

    var fixture = {
      message: 'Hello World',
      geo: {
        coordinates: { lat: 33.4500, lon: 112.0667 },
        dest: 'US',
        src: 'IN'
      },
      bytes: 10039103,
      '@timestamp': (new Date()).toString()
    };

    it('should only flatten keys as far as the mapping', function () {
      var obj = indexPattern.flattenWith('.', fixture);
      expect(obj).to.have.property('geo.coordinates', fixture.geo.coordinates);
      expect(obj).to.not.have.property('geo.coordinates.lat');
      expect(obj).to.not.have.property('geo.coordinates.lon');
      expect(obj).to.have.property('geo.dest', 'US');
      expect(obj).to.have.property('geo.src', 'IN');
      expect(obj).to.have.property('@timestamp', fixture['@timestamp']);
      expect(obj).to.have.property('message', 'Hello World');
      expect(obj).to.have.property('bytes', 10039103);
    });

  });
});
