define(function (require){
  var hasUnassigned = require('panels/marvel/shard_allocation/lib/hasUnassigned');

  describe('shard_allocation', function() {
    describe('lib/hasUnassigned.js', function () {

      it('should return true for unassigned shards', function () {
        expect(hasUnassigned({ unassigned: [1] })).to.equal(true);
      });

      it('should return false for empty unassigned shards', function () {
        expect(hasUnassigned({ unassigned: [] })).to.equal(false);
      });
      
    });
  });
});
