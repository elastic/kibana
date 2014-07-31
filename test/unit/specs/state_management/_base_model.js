define(function (require) {
  var angular = require('angular');
  var mocks = require('angular-mocks');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  require('services/private');

  // Load kibana
  require('index');

  describe('State Management', function () {
    describe('Model', function () {
      var $rootScope;
      var Model;

      beforeEach(function () {
        module('kibana');

        inject(function (_$rootScope_, Private) {
          $rootScope = _$rootScope_;
          Model = Private(require('components/state_management/_base_model'));
        });
      });

      it('should take an inital set of values', function () {
        var model = new Model({ message: 'test' });
        expect(model).to.have.property('message', 'test');
      });

      it('should trigger $on events', function (done) {
        var model = new Model();
        var stub = sinon.stub();
        model.on('test', stub);
        model.emit('test');
        sinon.assert.calledOnce(stub);
        done();
      });


      it('should be extendable ($on/$emit)', function (done) {

        function MyModel() {
          MyModel.Super.call(this);
        }
        _.inherits(MyModel, Model);

        var model = new MyModel();
        var stub = sinon.stub();
        model.on('test', stub);
        model.emit('test');
        sinon.assert.calledOnce(stub);
        done();
      });

      it('should serialize _attributes to RISON', function () {
        var model = new Model();
        model.message = 'Testing... 1234';
        var rison = model.toRISON();
        expect(rison).to.equal('(message:\'Testing... 1234\')');
      });

      it('should serialize _attributes for JSON', function () {
        var model = new Model();
        model.message = 'Testing... 1234';
        var json = JSON.stringify(model);
        expect(json).to.equal('{"message":"Testing... 1234"}');
      });

    });
  });

});
