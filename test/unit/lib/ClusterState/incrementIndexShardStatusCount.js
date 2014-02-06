define(function (require) {
  'use strict';
  var incrementIndexShardStatusCount = require('lib/ClusterState/incrementIndexShardStatusCount');
  var shard = { index: 'test' };

  describe('lib/ClusterState', function() {
    describe('incrementIndexShardStatusCount.js', function() {
      
      it('should set index count to 1', function() {
        expect(incrementIndexShardStatusCount('unassigned')({}, shard))
          .to.have.property('test')
          .to.have.property('unassigned', 1); 
      });

      it('should set index count to 2 if it exists', function() {
        expect(incrementIndexShardStatusCount('unassigned')({ test: { unassigned: 1 } }, shard))
          .to.have.property('test')
          .to.have.property('unassigned', 2); 
      });

    });
  });  
});
