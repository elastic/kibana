describe('ui/index_patterns/_calculate_indices', () => {
  const _ = require('lodash');
  const sinon = require('auto-release-sinon');
  const expect = require('expect.js');
  const ngMock = require('ngMock');

  let Promise;
  let $rootScope;
  let calculateIndices;
  let es;
  let config;
  let constraints;

  beforeEach(ngMock.module('kibana', ($provide) => {
    $provide.service('es', function (Promise) {
      return {
        fieldStats: sinon.stub().returns(Promise.resolve({
          indices: {
            'mock-*': 'irrelevant, is ignored'
          }
        }))
      };
    });
  }));

  beforeEach(ngMock.inject((Private, $injector) => {
    $rootScope = $injector.get('$rootScope');
    es = $injector.get('es');
    Promise = $injector.get('Promise');
    calculateIndices = Private(require('ui/index_patterns/_calculate_indices'));
  }));

  describe('transport configuration', () => {
    it('uses pattern path for indec', () => {
      run();
      expect(config.index).to.equal('wat-*-no');
    });
    it('has level indices', () => {
      run();
      expect(config.level).to.equal('indices');
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

  function run({ start = undefined, stop = undefined } = {}) {
    calculateIndices('wat-*-no', '@something', start, stop);
    $rootScope.$apply();
    config = _.first(es.fieldStats.firstCall.args);
    constraints = config.body.index_constraints;
  }
});
