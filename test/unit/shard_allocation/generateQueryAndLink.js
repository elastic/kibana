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
  var _ = require('lodash');
  var generateQueryAndLink = require('panels/marvel/shard_allocation/lib/generateQueryAndLink');
  var stringify = _.compose(encodeURIComponent, JSON.stringify);
  describe('shard_allocation', function () {
    describe('lib/generateQueryAndLink.js', function () {

      it('should return a node link', function () {
        var node = { ip_port: '127.0.0.1:9300', type: 'node', name: 'Test Node' };    
        var queries = stringify([{ a: node.name, q: 'node.ip_port.raw:"'+node.ip_port+'"' }]);
        var expected = '#/dashboard/script/marvel.nodes_stats.js?queries='+queries;
        expect(generateQueryAndLink(node)).to.equal(expected);
      }); 

      it('should return a index link', function () {
        var index = { type: 'index', name: 'Test index' };    
        var queries = stringify([{ a: index.name, q: 'index.raw:"'+index.name+'"' }]);
        var expected = '#/dashboard/script/marvel.indices_stats.js?queries='+queries;
        expect(generateQueryAndLink(index)).to.equal(expected);
      });

    });
  });
});