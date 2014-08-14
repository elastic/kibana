/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(function (require) {
  'use strict';
  var updateColors = require('panels/marvel/shard_allocation/lib/updateColors');
  describe('shard_allocation', function () {
    describe('lib/updateColors.js', function () {

      var scope;
      var data = [
        { 
          _id: 1,
          fields: { '@timestamp': [ '2014-01-01T00:00:00.000Z' ], status: 'GREEN' }
        },
        { 
          _id: 2,
          fields: { '@timestamp': [ '2014-01-01T00:00:00.000Z' ], status: 'GREEN' }
        },
        { 
          _id: 4,
          fields: { '@timestamp': [ '2014-01-02T00:00:00.000Z' ], status: 'YELLOW' }
        },
        { 
          _id: 5,
          fields: { '@timestamp': [ '2014-01-02T00:00:00.000Z' ], status: 'RED' }
        }
      ];

      beforeEach(function () {
        scope = { panel:{ total: data.length-1 }, timelineData: data, colors: void 0 };
        updateColors(scope); 
      });

      it('should set the first value to green with a left of 0 and width of 75', function () {
        expect(scope).to.have.property('colors')
          .to.have.deep.property('[0]')
          .to.have.property('width', 50);
        expect(scope).to.have.property('colors')
          .to.have.deep.property('[0]')
          .to.have.property('left', 0);
      });

      it('should set the secound value to yellow with a left of 75 and width of 25', function () {
        expect(scope).to.have.property('colors')
          .to.have.deep.property('[1]')
          .to.have.property('width', 25);
        expect(scope).to.have.property('colors')
          .to.have.deep.property('[1]')
          .to.have.property('left', 50);
      });

      it('should set the third value to red with a left of 100 and width of 25', function () {
        expect(scope).to.have.property('colors')
          .to.have.deep.property('[2]')
          .to.have.property('width', 25);
        expect(scope).to.have.property('colors')
          .to.have.deep.property('[2]')
          .to.have.property('left', 75);
      });

    }); 
  });
});