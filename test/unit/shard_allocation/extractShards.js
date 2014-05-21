define(function (require) {
  'use strict';
  var extractShards = require('lib/extractShards');
  var yellowStateOneIndex = require('/test/fixtures/yellowStateOneIndex.js');
  var relocatingState = require('/test/fixtures/relocatingState.js');
  var _ = require('lodash');
  var state = relocatingState();
  var shards = extractShards(state);
  var fakeState = require('lib/fakeState');

  describe('shard_allocation', function () {
    describe('transforms/extractShards.js', function () {

      it('should test performance', function() {
        var _state = fakeState({
          indices: 2000,
          replicas: 2,
          nodes: 100
        });
        var _shards = extractShards(_state); 
        expect(_shards)
          .to.be.instanceOf(Array)
          .to.have.length(30000);
      });

      it('should return an array', function () {
        expect(shards)
          .to.be.instanceOf(Array)
          .to.have.length(5); 
      });

      it('should set the relocating_message on initializing nodes', function () {
        var shard = _.find(shards, { state: 'INITIALIZING' });
        expect(shard).to.have.property('relocating_message', 'Relocating from The Second Node');
      });

      it('should set the relocating_message on relocating nodes', function () {
        var shard = _.find(shards, { state: 'RELOCATING' });
        expect(shard).to.have.property('relocating_message', 'Relocating to The Third Node');
      });

      it('should set the type to shard on each shard', function () {
        _.each(shards, function (shard) {
          expect(shard).to.have.property('type', 'shard');
        });
      });

      it('should set the nodeName attribute on each shard', function () {
        _.each(shards, function (shard) {
          expect(shard).to.have.property('nodeName', state.nodes[shard.node].name);
        });
      });

      it('should contain unassigned shards', function () {
        var shards = extractShards(yellowStateOneIndex());
        var unassigned = _.filter(shards, { state: 'UNASSIGNED' });
        expect(unassigned)
          .to.be.instanceOf(Array)
          .to.have.length(2);
      });

      it('should set nodeName to null for  unassigned shards', function () {
        var shards = extractShards(yellowStateOneIndex());
        var unassigned = _.filter(shards, { state: 'UNASSIGNED' });
        _.each(unassigned, function (shard) {
          expect(shard).to.have.property('nodeName', null);
        });
      });

    });
  });  
});
