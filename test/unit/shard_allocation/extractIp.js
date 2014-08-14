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
  var extractIp = require('panels/marvel/shard_allocation/lib/extractIp'); 

  describe('shard_allocation', function () {
    describe('lib/extractIp.js', function () {

      it('should match the ip address and port', function () {
        var node = {
          transport_address: 'inet[/127.0.0.1:9300]'
        };
        expect(extractIp(node)).to.equal('127.0.0.1:9300');
      }); 

      it('should match the ip address and port when the hostname is missing', function () {
        var node = {
          transport_address: 'inet[localhost/127.0.0.1:9300]'
        };
        expect(extractIp(node)).to.equal('127.0.0.1:9300');       
      }); 

      it('should return null for an empty node', function () {
        expect(extractIp()).to.equal(null);
      });

    });

  });

});
