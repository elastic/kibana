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
