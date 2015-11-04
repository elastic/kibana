describe('ui/index_patterns/_calculate_indices', () => {
  const _ = require('lodash');
  const sinon = require('auto-release-sinon');
  const expect = require('expect.js');
  const ngMock = require('ngMock');

  let Promise;
  let $rootScope;
  let calculateIndices;
  let es;
  let response;
  let config;
  let constraints;

  beforeEach(ngMock.module('kibana', ($provide) => {
    response = {
      indices: {
        'mock-*': 'irrelevant, is ignored'
      }
    };

    $provide.service('es', function (Promise) {
      return {
        fieldStats: sinon.spy(function () {
          return Promise.resolve(response);
        })
      };
    });
  }));

  beforeEach(ngMock.inject((Private, $injector) => {
    $rootScope = $injector.get('$rootScope');
    es = $injector.get('es');
    Promise = $injector.get('Promise');
    calculateIndices = Private(require('ui/index_patterns/_calculate_indices'));
  }));

  function run({ start = undefined, stop = undefined } = {}) {
    calculateIndices('wat-*-no', '@something', start, stop);
    $rootScope.$apply();
    config = _.first(es.fieldStats.firstCall.args);
    constraints = config.body.index_constraints;
  }

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
      it('includes max_value', () => {
        expect(constraints['@something']).to.have.property('max_value');
      });
      it('max_value is gte', () => {
        expect(constraints['@something'].max_value).to.have.property('gte');
      });
    });

    context('when given stop', () => {
      beforeEach(() => run({ stop: '1234567890' }));
      it('includes min_value', () => {
        expect(constraints['@something']).to.have.property('min_value');
      });
      it('min_value is lte', () => {
        expect(constraints['@something'].min_value).to.have.property('lte');
      });
    });
  });

  describe('response sorting', function () {
    require('testUtils/noDigestPromises').activateForSuite();

    context('when no sorting direction given', function () {
      it('returns the indices in the order that elasticsearch sends them', function () {
        response = {
          indices: {
            c: { fields: { time: {} } },
            a: { fields: { time: {} } },
            b: { fields: { time: {} } },
          }
        };

        return calculateIndices('*', 'time', null, null).then(function (resp) {
          expect(resp).to.eql(['c', 'a', 'b']);
        });
      });
    });

    context('when sorting desc', function () {
      it('returns the indices in max_value order', function () {
        response = {
          indices: {
            c: { fields: { time: { max_value: 10 } } },
            a: { fields: { time: { max_value: 15 } } },
            b: { fields: { time: { max_value: 1 } } },
          }
        };

        return calculateIndices('*', 'time', null, null, 'desc').then(function (resp) {
          expect(resp).to.eql(['a', 'c', 'b']);
        });
      });
    });

    context('when sorting asc', function () {
      it('returns the indices in min_value order', function () {
        response = {
          indices: {
            c: { fields: { time: { max_value: 10, min_value: 9 } } },
            a: { fields: { time: { max_value: 15, min_value: 5 } } },
            b: { fields: { time: { max_value: 1, min_value: 0 } } },
          }
        };

        return calculateIndices('*', 'time', null, null, 'asc').then(function (resp) {
          expect(resp).to.eql(['b', 'a', 'c']);
        });
      });
    });
  });
});
