define(function (require) {
  var filterHiddenIndices = require('panels/marvel/shard_allocation/lib/filterHiddenIndices');
  describe('shard_allocation', function() {
    describe('lib/filterHiddenIndices.js', function () {

      it('should return false for hidden indices', function () {
        expect(filterHiddenIndices({ index: '.marvel' })).to.equal(false);
      });

      it('should return true for non hidden indices', function () {
        expect(filterHiddenIndices({ index: 'marvel' })).to.equal(true); 
      });

    });
    
  });
});
