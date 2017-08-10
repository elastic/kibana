import { QueryManagerProvider } from '../query_manager';
import { FilterManagerProvider } from 'ui/filter_manager';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import NoDigestPromises from 'test_utils/no_digest_promises';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import moment from 'moment';

describe('QueryManager', function () {
  NoDigestPromises.activateForSuite();

  let queryManager;
  let filterManager;
  let indexPattern;
  let timefilter;

  beforeEach(ngMock.module(
    'kibana',
    'kibana/courier',
    function ($provide) {
      $provide.service('courier', require('fixtures/mock_courier'));
    }
  ));

  beforeEach(ngMock.inject(function (Private, _timefilter_) {
    timefilter = _timefilter_;
    indexPattern = Private(StubbedLogstashIndexPatternProvider);
    queryManager = Private(QueryManagerProvider);
    filterManager = Private(FilterManagerProvider);
    sinon.stub(filterManager, 'add');
  }));

  describe('add', function () {

    it('should defer to the FilterManager when dealing with a lucene query', function () {
      const state = {
        query: { query: 'foo', language: 'lucene' }
      };
      const args = ['foo', ['bar'], '+', indexPattern];
      queryManager = queryManager(state);
      queryManager.add(...args);
      expect(filterManager.add.calledOnce).to.be(true);
      expect(filterManager.add.calledWith(...args)).to.be(true);
    });

    it('should add an operator style "is" function to kuery queries' , function () {
      const state = {
        query: { query: '', language: 'kuery' }
      };
      queryManager = queryManager(state);
      queryManager.add('foo', 'bar', '+', indexPattern);
      expect(state.query.query).to.be('"foo":"bar"');
    });

    it('should combine the new clause with any existing query clauses using an implicit "and"' , function () {
      const state = {
        query: { query: 'foo', language: 'kuery' }
      };
      queryManager = queryManager(state);
      queryManager.add('foo', 'bar', '+', indexPattern);
      expect(state.query.query).to.be('foo "foo":"bar"');
    });

    it('should support creation of negated clauses' , function () {
      const state = {
        query: { query: 'foo', language: 'kuery' }
      };
      queryManager = queryManager(state);
      queryManager.add('foo', 'bar', '-', indexPattern);
      expect(state.query.query).to.be('foo !"foo":"bar"');
    });

    it('should add an exists query when the provided field name is "_exists_"' , function () {
      const state = {
        query: { query: 'foo', language: 'kuery' }
      };
      queryManager = queryManager(state);
      queryManager.add('_exists_', 'baz', '+', indexPattern);
      expect(state.query.query).to.be('foo exists("baz")');
    });

  });

  describe('addLegacyFilter', function () {

    const filter = {
      meta: {
        index: 'logstash-*',
        type: 'phrase',
        key: 'machine.os',
        params: {
          query: 'osx'
        },
      },
      query: {
        match: {
          'machine.os': {
            query: 'osx',
            type: 'phrase'
          }
        }
      }
    };

    it('should return a Promise', function () {
      const state = {
        query: { query: '', language: 'lucene' }
      };
      queryManager = queryManager(state);
      expect(queryManager.addLegacyFilter(filter)).to.be.a(Promise);
    });

    // The filter bar directive will handle new filters when lucene is selected
    it('should do nothing if the query language is not "kuery"', function () {
      const state = {
        query: { query: '', language: 'lucene' }
      };
      queryManager = queryManager(state);
      return queryManager.addLegacyFilter(filter)
        .then(() => {
          expect(state.query.query).to.be('');
        });
    });

    it('should add a query clause equivalent to the given filter', function () {
      const state = {
        query: { query: '', language: 'kuery' }
      };
      queryManager = queryManager(state);
      return queryManager.addLegacyFilter(filter)
        .then(() => {
          expect(state.query.query).to.be('"machine.os":"osx"');
        });
    });

    it('time field filters should update the global time filter instead of modifying the query', function () {
      const startTime = moment('1995');
      const endTime = moment('1996');
      const state = {
        query: { query: '', language: 'kuery' }
      };
      const timestampFilter = {
        meta: {
          index: 'logstash-*',
        },
        range: {
          time: {
            gt: startTime.valueOf(),
            lt: endTime.valueOf(),
          }
        }
      };
      queryManager = queryManager(state);
      return queryManager.addLegacyFilter(timestampFilter)
        .then(() => {
          expect(state.query.query).to.be('');
          expect(startTime.isSame(timefilter.time.from)).to.be(true);
          expect(endTime.isSame(timefilter.time.to)).to.be(true);
        });
    });

  });

});
