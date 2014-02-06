define(function (require) {
  var countChildren = require('panels/marvel/shard_allocation/lib/countChildren');  
  describe('shard_allocation', function () {
    describe('lib/countChildren.js', function () {

      it('should return 1 for narmal children', function() {
        expect(countChildren(0, { name: 'Example' })).to.equal(1); 
      });

      it('should return 0 for unassigned children', function() {
        expect(countChildren(0, { name: 'Unassigned' })).to.equal(0); 
      });

    });
  });
});

