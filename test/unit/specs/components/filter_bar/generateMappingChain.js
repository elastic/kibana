/* global sinon */
define(function (require) {
  var generateMappingChain = require('components/filter_bar/lib/generateMappingChain');

  describe('Filter Bar Directive', function () {
    describe('generateMappingChain()', function () {

      var generateMappingChain, $rootScope, Promise;
      beforeEach(module('kibana'));
      beforeEach(inject(function (Private, _$rootScope_, _Promise_) {
        $rootScope = _$rootScope_;
        Promise    = _Promise_;
        generateMappingChain = Private(require('components/filter_bar/lib/generateMappingChain'));
      }));


      it('should create a chaning function which calls the next function if the promise is rejected', function (done) {
        var mapping = sinon.stub();
        mapping.returns(Promise.reject());
        var mappingChainFn = generateMappingChain(mapping);
        var next = sinon.stub();
        next.returns(Promise.resolve('good'));
        var chain = mappingChainFn(next);
        chain({}).then(function (result) {
          expect(result).to.be('good');
          sinon.assert.calledOnce(next);
          done();
        });
        $rootScope.$apply();
      });

      it('should create a chaning function which DOES NOT call the next function if the result is resolved', function (done) {
        var mapping = sinon.stub();
        mapping.returns(Promise.resolve('good'));
        var mappingChainFn = generateMappingChain(mapping);
        var next = sinon.stub();
        next.returns(Promise.resolve('bad'));
        var chain = mappingChainFn(next);
        chain({}).then(function (result) {
          expect(result).to.be('good');
          sinon.assert.notCalled(next);
          done();
        });
        $rootScope.$apply();
      });

      it('should resolve result for the mapping function', function (done) {
        var mapping = sinon.stub();
        mapping.returns(Promise.resolve({ key: 'test', value: 'example' }));
        var mappingChainFn = generateMappingChain(mapping);
        var next = sinon.stub();
        var chain = mappingChainFn(next);
        chain({}).then(function (result) {
          sinon.assert.notCalled(next);
          expect(result).to.eql({ key: 'test', value: 'example' });
          done();
        });
        $rootScope.$apply();
      });

      it('should call the mapping function with the argument to the chain', function (done) {
        var mapping = sinon.stub();
        mapping.returns(Promise.resolve({ key: 'test', value: 'example' }));
        var mappingChainFn = generateMappingChain(mapping);
        var next = sinon.stub();
        var chain = mappingChainFn(next);
        chain({ test: 'example' }).then(function (result) {
          sinon.assert.calledOnce(mapping);
          expect(mapping.args[0][0]).to.eql({ test: 'example' });
          sinon.assert.notCalled(next);
          expect(result).to.eql({ key: 'test', value: 'example' });
          done();
        });
        $rootScope.$apply();
      });

      it('should resolve result for the next function', function (done) {
        var mapping = sinon.stub();
        mapping.returns(Promise.reject());
        var mappingChainFn = generateMappingChain(mapping);
        var next = sinon.stub();
        next.returns(Promise.resolve({ key: 'test', value: 'example' }));
        var chain = mappingChainFn(next);
        chain({}).then(function (result) {
          sinon.assert.calledOnce(mapping);
          sinon.assert.calledOnce(next);
          expect(result).to.eql({ key: 'test', value: 'example' });
          done();
        });
        $rootScope.$apply();
      });

      it('should reject with an error if no functions match', function (done) {
        var mapping = sinon.stub();
        mapping.returns(Promise.reject());
        var mappingChainFn = generateMappingChain(mapping);
        var chain = mappingChainFn();
        chain({}).catch(function (err) {
          expect(err).to.be.an(Error);
          expect(err.message).to.be('No mapping have been found for filter.');
          done();
        });
        $rootScope.$apply();
      });

    });
  });
});
