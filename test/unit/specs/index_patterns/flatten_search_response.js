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
          '@timestamp': { type: 'date' },
          'team': { type: 'nested' },
          'team.name': { type: 'string' },
          'team.role': { type: 'string' }
        }
      }
    };

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
      noMapping: true,
      team: [
        { name: 'foo', role: 'leader' },
        { name: 'bar', role: 'follower' },
        { name: 'baz', role: 'party boy' },
      ]
    };

    var flat = flattenSearchResponse(indexPattern, fixture);

    it('should flatten keys as far down as the mapping goes', function () {
      expect(flat).to.have.property('geo.coordinates', fixture.geo.coordinates);
      expect(flat).to.not.have.property('geo.coordinates.lat');
      expect(flat).to.not.have.property('geo.coordinates.lon');
      expect(flat).to.have.property('geo.dest', 'US');
      expect(flat).to.have.property('geo.src', 'IN');
      expect(flat).to.have.property('@timestamp', fixture['@timestamp']);
      expect(flat).to.have.property('message', 'Hello World');
      expect(flat).to.have.property('bytes', 10039103);
    });

    it('should flatten keys not in the mapping', function () {
      expect(flat).to.have.property('noMapping', true);
    });

    it('should preserve objects in arrays', function () {
      expect(flat).to.have.property('tags', fixture['tags']);
    });

    it('should completely flatten nested docs', function () {
      expect(flat).to.have.property('team', fixture.team);
      expect(flat).to.not.have.property('team.name');
      expect(flat).to.not.have.property('team.role');
      expect(flat).to.not.have.property('team[0]');
      expect(flat).to.not.have.property('team.0');
    });
  });
});
