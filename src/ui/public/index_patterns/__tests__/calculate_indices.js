describe('ui/index_patterns/_calculate_indices', () => {
  const _ = require('lodash');
  const sinon = require('auto-release-sinon');
  const expect = require('expect.js');
  const ngMock = require('ngMock');

  let Promise;
  let $rootScope;
  let calculateIndices;
  let error;
  let response;
  let transportRequest;
  let config;
  let constraints;

  beforeEach(ngMock.module('kibana', ($provide) => {
    error = undefined;
    response = { indices: { 'mock-*': 'irrelevant, is ignored' } };
    transportRequest = sinon.spy((options, fn) => fn(error, response));
    $provide.value('es', _.set({}, 'transport.request', transportRequest));
  }));

  beforeEach(ngMock.inject((Private, $injector) => {
    $rootScope = $injector.get('$rootScope');
    Promise = $injector.get('Promise');
    calculateIndices = Private(require('ui/index_patterns/_calculate_indices'));
  }));

  describe('transport configuration', () => {
    it('is POST', () => {
      run();
      expect(config.method).to.equal('POST');
    });
    it('uses pattern path for _field_stats', () => {
      run();
      expect(config.path).to.equal('/wat-*-no/_field_stats');
    });
    it('has level indices', () => {
      run();
      expect(config.query.level).to.equal('indices');
    });
    it('includes time field', () => {
      run();
      expect(_.includes(config.body.fields, '@something')).to.be(true);
    });
    it('no constraints by default', () => {
      run();
      expect(_.size(constraints['@something'])).to.equal(0);
    });

    context('when given start', () => {
      beforeEach(() => run({ start: '1234567890' }));
      it('includes min_value', () => {
        expect(constraints['@something']).to.have.property('min_value');
      });
      it('min_value is gte', () => {
        expect(constraints['@something'].min_value).to.have.property('gte');
      });
    });

    context('when given stop', () => {
      beforeEach(() => run({ stop: '1234567890' }));
      it('includes max_value', () => {
        expect(constraints['@something']).to.have.property('max_value');
      });
      it('max_value is lt', () => {
        expect(constraints['@something'].max_value).to.have.property('lt');
      });
    });
  });

  describe('returned promise', () => {
    it('is rejected by transport errors', () => {
      error = 'something';

      let reason;
      calculateIndices('one', 'two').then(null, val => reason = val);
      $rootScope.$apply();

      expect(reason).to.equal(error);
    });
    it('is fulfilled by array of indices in successful response', () => {

      let indices;
      calculateIndices('one', 'two').then(val => indices = val);
      $rootScope.$apply();

      expect(_.first(indices)).to.equal('mock-*');
    });
  });

  function run({ start = undefined, stop = undefined } = {}) {
    calculateIndices('wat-*-no', '@something', start, stop);
    $rootScope.$apply();
    config = _.first(transportRequest.firstCall.args);
    constraints = config.body.index_constraints;
  }
});
