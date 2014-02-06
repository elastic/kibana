define(function (require) {
  'use strict';

  var explainStatus = require('lib/ClusterState/explainStatus');
  var yellowStateOneIndex = require('/test/fixtures/yellowStateOneIndex.js');
  var yellowStateTwoIndices = require('/test/fixtures/yellowStateTwoIndices.js');
  var yellowStateOneIndexInitializing = require('/test/fixtures/yellowStateOneIndexInitializing.js');
  var redStateOneIndex = require('/test/fixtures/redStateOneIndex.js');
  var redStateTwoIndices = require('/test/fixtures/redStateTwoIndices.js');
  var redStateOneIndexInitializingPrimary = require('/test/fixtures/redStateOneIndexInitializingPrimary.js');
  var redStateTwoIndicesInitializingPrimaries = require('/test/fixtures/redStateTwoIndicesInitializingPrimaries.js');
  var greenState = require('/test/fixtures/greenState.js');

  describe('lib/ClusterState', function() {
    describe('#explainStatus()', function() {
      
      it('should return a yellow message with the index name and 2 unassigned shards.', function () {
        var scope = { state: yellowStateOneIndex() };
        var expected = ['test-2014.01.01 has 2 unassigned replica shards.'];
        var messages = explainStatus(scope);
        expect(messages).to.deep.equal(expected);
      });    

      it('should return a yellow message with the index name and number 2 unassigned and 1 initializing shards.', function () {
        var scope = { state: yellowStateOneIndexInitializing() };
        var expected = ['test-2014.01.01 has 2 unassigned and 1 initializing replica shards.'];
        var messages = explainStatus(scope);
        expect(messages).to.deep.equal(expected);
      });    

      it('should return a red message with the index name and 1 unassigned primary.', function () {
        var scope = { state: redStateOneIndex() };
        var expected = [
          'test-2014.01.01 has 1 unassigned primary shards.'
        ];
        var messages = explainStatus(scope);
        expect(messages).to.deep.equal(expected);
      });    

      it('should return a red message with the index name and 1 initializing primary.', function () {
        var scope = { state: redStateOneIndexInitializingPrimary() };
        var expected = [
          'test-2014.01.01 has 1 initializing primary shards.'
        ];
        var messages = explainStatus(scope);
        expect(messages).to.deep.equal(expected);
      });    

      it('should return a yellow message with the number of indices that have unassigned shards.', function () {
        var scope = { state: yellowStateTwoIndices() };
        var expected = [
          'test-2014.01.01 has 2 unassigned replica shards.',
          'test-2014.01.02 has 2 unassigned replica shards.'
        ];
        var messages = explainStatus(scope);
        expect(messages).to.deep.equal(expected);
      });    

      it('should return a red message with the number of indices that have unassigned shards.', function () {
        var scope = { state: redStateTwoIndicesInitializingPrimaries() };
        var expected = [
          'test-2014.01.02 has 1 unassigned primary shards.',
          'test-2014.01.01 has 1 initializing primary shards.',
        ];
        var messages = explainStatus(scope);
        expect(messages).to.deep.equal(expected);
      });    

      it('should return a red message with the number of indices that have unassigned shards.', function () {
        var scope = { state: redStateTwoIndices() };
        var expected = [
          "test-2014.01.01 has 1 unassigned primary shards.",
          "test-2014.01.02 has 2 unassigned replica shards.",
        ];
        var messages = explainStatus(scope);
        expect(messages).to.deep.equal(expected);
      });    

      it('should return a messages for a single index.', function () {
        var scope = { state: redStateTwoIndices() };
        var expected = [
          "test-2014.01.01 has 1 unassigned primary shards."
        ];
        var messages = explainStatus(scope, 'test-2014.01.01');
        expect(messages).to.deep.equal(expected);
      });    

      it('should return an empty array for green cluster.', function () {
        var scope = { state: greenState() };
        var messages = explainStatus(scope, 'test-2014.01.01');
        expect(messages).to.be.empty;
      });    
    });
  });
});
