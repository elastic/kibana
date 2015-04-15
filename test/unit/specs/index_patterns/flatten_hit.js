define(function (require) {
  var _ = require('lodash');
  var flattenHit = require('components/index_patterns/_flatten_hit');

  describe('IndexPattern#flattenHit()', function () {

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
          'team.role': { type: 'string' },
          'user': { type: 'conflict' },
          'user.name': { type: 'string' },
          'user.id': { type: 'conflict' },
          'delta': { type: 'number', scripted: true }
        }
      }
    };

    var hit = {
      _source: {
        message: 'Hello World',
        geo: {
          coordinates: { lat: 33.4500, lon: 112.0667 },
          dest: 'US',
          src: 'IN'
        },
        bytes: 10039103,
        '@timestamp': (new Date()).toString(),
        tags: [{ text: 'foo' }, { text: 'bar' }],
        groups: ['loners'],
        noMapping: true,
        team: [
          { name: 'foo', role: 'leader' },
          { name: 'bar', role: 'follower' },
          { name: 'baz', role: 'party boy' },
        ],
        user: { name: 'smith', id: 123 }
      },
      fields: {
        delta: [42],
        random: [0.12345]
      }
    };

    var flat = flattenHit(indexPattern, hit);

    it('flattens keys as far down as the mapping goes', function () {
      expect(flat).to.have.property('geo.coordinates', hit._source.geo.coordinates);
      expect(flat).to.not.have.property('geo.coordinates.lat');
      expect(flat).to.not.have.property('geo.coordinates.lon');
      expect(flat).to.have.property('geo.dest', 'US');
      expect(flat).to.have.property('geo.src', 'IN');
      expect(flat).to.have.property('@timestamp', hit._source['@timestamp']);
      expect(flat).to.have.property('message', 'Hello World');
      expect(flat).to.have.property('bytes', 10039103);
    });

    it('flattens keys not in the mapping', function () {
      expect(flat).to.have.property('noMapping', true);
      expect(flat).to.have.property('groups');
      expect(flat.groups).to.eql(['loners']);
    });

    it('flattens conflicting types in the mapping', function () {
      expect(flat).to.not.have.property('user');
      expect(flat).to.have.property('user.name', hit._source.user.name);
      expect(flat).to.have.property('user.id', hit._source.user.id);
    });

    it('preserves objects in arrays', function () {
      expect(flat).to.have.property('tags', hit._source.tags);
    });

    it('does not enter into nested fields', function () {
      expect(flat).to.have.property('team', hit._source.team);
      expect(flat).to.not.have.property('team.name');
      expect(flat).to.not.have.property('team.role');
      expect(flat).to.not.have.property('team[0]');
      expect(flat).to.not.have.property('team.0');
    });

    it('unwraps script fields', function () {
      expect(flat).to.have.property('delta', 42);
    });

    it('assumes that all fields are "computed fields"', function () {
      expect(flat).to.have.property('random', 0.12345);
    });
  });
});
