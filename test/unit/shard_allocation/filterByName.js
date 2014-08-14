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



define(function (require){
  var filterByName = require('panels/marvel/shard_allocation/lib/filterByName');
  describe('shard_allocation', function() {
    describe('lib/filterByName', function () {

      var item = { name: "logstash-2014.02.01", ip_port: '127.0.0.1:9400' };

      it('should match regular expressions', function () {
        expect(filterByName('^logstash-\\d+\\.\\d+\\.\\d+$')(item)).to.equal(true);
      }); 

      it('should match partial strings', function () {
        expect(filterByName('logst')(item)).to.equal(true);
      }); 

      it('should not match invaild search', function () {
        expect(filterByName('marvel')(item)).to.equal(false);
      }); 

      it('should match the ip_port', function () {
        expect(filterByName('127.0.0.1:9400')(item)).to.equal(true);
        expect(filterByName('127.0.0.1:9401')(item)).to.equal(false);
      });

      it('should return true if the search phrase is empty', function () {
        expect(filterByName('')(item)).to.equal(true);
      });

    });
    
  });
});
