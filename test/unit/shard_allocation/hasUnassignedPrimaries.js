define(function (require){
  var hasUnassignedPrimaries = require('panels/marvel/shard_allocation/lib/hasPrimaryChildren');

  describe('shard_allocation', function() {
    describe('lib/hasUnassignedPrimaries', function () {

      it('should return true for unassigned primaries', function () {
        expect(hasUnassignedPrimaries({
          children: [ 
            {  primary: true }
          ]
        })).to.equal(true); 
      }); 

      it('should return false for unassigned replicas', function () {
        expect(hasUnassignedPrimaries({
          children: [ 
            { primary: false }
          ]
        })).to.equal(false); 
      }); 

    });
  });
});
