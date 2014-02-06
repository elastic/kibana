define(function (require) {
  'use strict';
  var _ = require('lodash');
  var explain = require('lib/ClusterState/explain');
  var yellowStateOneIndex = require('/test/fixtures/yellowStateOneIndex.js');
  var yellowStateOneIndexInitializing = require('/test/fixtures/yellowStateOneIndexInitializing.js');
  var yellowStateTwoIndices = require('/test/fixtures/yellowStateTwoIndices.js');
  var redStateOneIndex = require('/test/fixtures/redStateOneIndex.js');
  var redStateTwoIndices = require('/test/fixtures/redStateTwoIndices.js');
  var redStateOneIndexInitializing = require('/test/fixtures/redStateOneIndexInitializingPrimary.js');
  var redStateTwoIndicesInitializing = require('/test/fixtures/redStateTwoIndicesInitializingPrimaries.js');

  describe('lib/ClusterState', function() {
    describe('explain.js', function() {

      it('should set yellow index to 2 for one indices', function() {
        var plan = explain(yellowStateOneIndex());
        expect(plan)
          .to.have.property('yellow')
          .to.have.property('test-2014.01.01')
          .to.have.property('unassigned', 2);
        expect(_.keys(plan.yellow)).to.have.length(1);
      });    

      it('should set yellow unassigned to 2 for 2 indices', function() {
        var plan = explain(yellowStateTwoIndices()); 
        expect(plan)
          .to.have.property('yellow')
          .to.have.property('test-2014.01.01')
          .to.have.property('unassigned', 2);
        expect(plan)
          .to.have.property('yellow')
          .to.have.property('test-2014.01.02')
          .to.have.property('unassigned', 2);
        expect(_.keys(plan.yellow)).to.have.length(2);
      });    

      it('should set yellow initializing to 1 for 1 index', function() {
        var plan = explain(yellowStateOneIndexInitializing());
        expect(plan)
          .to.have.property('yellow')
          .to.have.property('test-2014.01.01')
          .to.have.property('initializing', 1);
        expect(_.keys(plan.yellow)).to.have.length(1);
      });    


      it('should set one red index to 1', function() {
        var plan = explain(redStateOneIndex());
        expect(plan)
          .to.have.property('red')
          .to.have.property('test-2014.01.01')
          .to.have.property('unassigned', 1);
      });    

      it('should set red initializing to 1 for 1 index', function() {
        var plan = explain(redStateOneIndexInitializing());
        expect(plan)
          .to.have.property('red')
          .to.have.property('test-2014.01.01')
          .to.have.property('initializing', 1);
        expect(_.keys(plan.red)).to.have.length(1);
      });    

      it('should set red initializing to 1 for 2 indices', function() {
        var plan = explain(redStateTwoIndicesInitializing());
        expect(plan)
          .to.have.property('red')
          .to.have.property('test-2014.01.01')
          .to.have.property('initializing', 1);
        expect(_.keys(plan.red)).to.have.length(2);
      });    

    }); 
  });  
});
