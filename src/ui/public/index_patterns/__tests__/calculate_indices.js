import { pluck } from 'lodash';
import _ from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import moment from 'moment';
import { IndexPatternsCalculateIndicesProvider } from 'ui/index_patterns/_calculate_indices';

describe('IndexPatternsCalculateIndicesProvider', () => {
  let $rootScope;
  let calculateIndices;
  let es;
  let response;
  let config;
  let constraints;
  let indices;

  beforeEach(ngMock.module('kibana', ($provide) => {
    response = {
      indices: {
        'mock-*': { fields: { '@something': {} } },
        'ignore-*': { fields: {} }
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
    calculateIndices = Private(IndexPatternsCalculateIndicesProvider);
  }));

  function run({ start = undefined, stop = undefined } = {}) {
    calculateIndices('wat-*-no', '@something', start, stop).then(value => {
      indices = pluck(value, 'index');
    });
    $rootScope.$apply();
    config = _.first(es.fieldStats.lastCall.args);
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

    describe('when given start', () => {
      beforeEach(() => run({ start: '1234567890' }));
      it('includes max_value', () => {
        expect(constraints['@something']).to.have.property('max_value');
      });
      it('max_value is gte', () => {
        expect(constraints['@something'].max_value).to.have.property('gte');
      });
      it('max_value is set to original if not a moment object', () => {
        expect(constraints['@something'].max_value.gte).to.equal('1234567890');
      });
      it('max_value format is set to epoch_millis', () => {
        expect(constraints['@something'].max_value.format).to.equal('epoch_millis');
      });
      it('max_value is set to moment.valueOf if given a moment object', () => {
        const start = moment();
        run({ start });
        expect(constraints['@something'].max_value.gte).to.equal(start.valueOf());
      });
    });

    describe('when given stop', () => {
      beforeEach(() => run({ stop: '1234567890' }));
      it('includes min_value', () => {
        expect(constraints['@something']).to.have.property('min_value');
      });
      it('min_value is lte', () => {
        expect(constraints['@something'].min_value).to.have.property('lte');
      });
      it('min_value is set to original if not a moment object', () => {
        expect(constraints['@something'].min_value.lte).to.equal('1234567890');
      });
      it('min_value format is set to epoch_millis', () => {
        expect(constraints['@something'].min_value.format).to.equal('epoch_millis');
      });
      it('max_value is set to moment.valueOf if given a moment object', () => {
        const stop = moment();
        run({ stop });
        expect(constraints['@something'].min_value.lte).to.equal(stop.valueOf());
      });
    });
  });

  describe('response filtering', () => {
    it('filters out any indices that have empty fields', () => {
      run();
      expect(_.includes(indices, 'mock-*')).to.be(true);
      expect(_.includes(indices, 'ignore-*')).to.be(false);
    });
  });

  describe('response sorting', function () {
    require('test_utils/no_digest_promises').activateForSuite();

    describe('when no sorting direction given', function () {
      it('returns the indices in the order that elasticsearch sends them', function () {
        response = {
          indices: {
            c: { fields: { time: {} } },
            a: { fields: { time: {} } },
            b: { fields: { time: {} } },
          }
        };

        return calculateIndices('*', 'time', null, null).then(function (resp) {
          expect(pluck(resp, 'index')).to.eql(['c', 'a', 'b']);
        });
      });
    });

    describe('when sorting asc', function () {
      it('resolves to an array of objects, each with index, start, and end properties', function () {
        response = {
          indices: {
            c: { fields: { time: { max_value: 10, min_value: 9 } } },
            a: { fields: { time: { max_value: 15, min_value: 5 } } },
            b: { fields: { time: { max_value: 1, min_value: 0 } } },
          }
        };

        return calculateIndices('*', 'time', null, null, 'asc').then(function (resp) {
          expect(resp).to.eql([
            {
              index: 'b',
              min: 0,
              max: 1
            },
            {
              index: 'a',
              min: 5,
              max: 15
            },
            {
              index: 'c',
              min: 9,
              max: 10
            }
          ]);
        });
      });
    });

    describe('when sorting desc', function () {
      it('resolves to an array of objects, each with index, min, and max properties', function () {
        response = {
          indices: {
            c: { fields: { time: { max_value: 10, min_value: 9 } } },
            a: { fields: { time: { max_value: 15, min_value: 5 } } },
            b: { fields: { time: { max_value: 1, min_value: 0 } } },
          }
        };

        return calculateIndices('*', 'time', null, null, 'desc').then(function (resp) {
          expect(resp).to.eql([
            {
              index: 'a',
              max: 15,
              min: 5
            },
            {
              index: 'c',
              max: 10,
              min: 9
            },
            {
              index: 'b',
              max: 1,
              min: 0
            },
          ]);
        });
      });
    });
  });
});
