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