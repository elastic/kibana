define(function (require) {
  'use strict';
  var extractMarkers = require('panels/marvel/shard_allocation/lib/extractMarkers');
  var moment = require('moment');

  describe('shard_allocation', function () {
    describe('lib/extractMarkers.js', function () {
      var results;
      var data = [
        { 
          _id: 1,
          fields: { '@timestamp': [ '2014-01-01T00:00:00.000Z' ] }
        },
        { 
          _id: 2,
          fields: { '@timestamp': [ '2014-01-01T00:00:00.000Z' ] }
        },
        { 
          _id: 3,
          fields: { '@timestamp': [ '2014-01-02T00:00:00.000Z' ] }
        }
      ];

      beforeEach(function () {
        results = extractMarkers(data); 
      });

      it('should return 2 markers', function () {
        expect(results).to.have.length(2);
      });

      it('should set the count of the of the first marker to be 0', function () {
        expect(results[0]).to.have.property('count', 0);
      });

      it('should set the count of the of the second marker to be 2', function () {
        expect(results[1]).to.have.property('count', 2);
      });

      it('should set the display and format it to month/day', function () {
        expect(results[0]).to.have.property('display', '1/1');
      });

    });
  });
});