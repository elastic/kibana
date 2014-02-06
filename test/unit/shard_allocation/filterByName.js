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
