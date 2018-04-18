import { Scanner } from '../scanner';
import expect from 'expect.js';
import 'elasticsearch-browser';
import ngMock from 'ng_mock';
import sinon from 'sinon';

describe('Scanner', function () {
  let http;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($http) {
    http = $http;
  }));

  afterEach(function () {
    http = null;
  });

  describe('initialization', function () {
    it('should throw errors if missing arguments on initialization', function () {
      expect(() => new Scanner()).to.throwError();
      expect(() => new Scanner(http)).to.throwError();
      expect(() => new Scanner(http, {
        index: 'foo',
        type: 'bar'
      })).not.to.throwError();
    });
  });

  describe('scan', function () {
    let httpPost;
    let search;
    let scroll;
    let scanner;
    const mockSearch = { '_scroll_id': 'abc', 'took': 1, 'timed_out': false, '_shards': { 'total': 1, 'successful': 1, 'failed': 0 }, 'hits': { 'total': 2, 'max_score': 0.0, 'hits': [] } }; // eslint-disable-line max-len
    const hits = [{
      _id: 'one',
      _type: 'config',
      _source: { title: 'First title' }
    }, {
      _id: 'two',
      _type: 'config',
      _source: { title: 'Second title' }
    }];
    const mockScroll = { 'took': 1, 'timed_out': false, '_shards': { 'total': 1, 'successful': 1, 'failed': 0 }, 'hits': { 'total': 2, 'max_score': 0.0, 'hits': hits } }; // eslint-disable-line max-len

    beforeEach(function () {
      scanner = new Scanner(http, {
        index: 'foo',
        type: 'bar'
      });

      search = sinon.stub().returns(Promise.resolve({ data: mockSearch }));
      scroll = sinon.stub().returns(Promise.resolve({ data: mockScroll }));
      httpPost = sinon.stub(scanner.$http, 'post', (path, ...args) => {
        if (path.includes('legacy_scroll_start')) {
          return search(...args);
        }
        if (path.includes('legacy_scroll_continue')) {
          return scroll(...args);
        }
        throw new Error(`Unexpected path to $http.post(): ${path}`);
      });
    });

    it('should reject when an error occurs', function () {
      search = search.returns(Promise.reject(new Error('fail.')));
      return scanner.scanAndMap('')
        .then(function () {
          throw new Error('should reject');
        })
        .catch(function (error) {
          expect(error.message).to.be('fail.');
        });
    });

    it('should search and then scroll for results', function () {
      return scanner.scanAndMap('')
        .then(function () {
          expect(search.called).to.be(true);
          expect(scroll.called).to.be(true);
        });
    });

    it('should map results if a function is provided', function () {
      return scanner.scanAndMap(null, null, function (hit) {
        return hit._id.toUpperCase();
      })
        .then(function (response) {
          expect(response.hits[0]).to.be('ONE');
          expect(response.hits[1]).to.be('TWO');
        });
    });

    it('should only return the requested number of documents', function () {
      return scanner.scanAndMap(null, { docCount: 1 }, function (hit) {
        return hit._id.toUpperCase();
      })
        .then(function (response) {
          expect(response.hits[0]).to.be('ONE');
          expect(response.hits[1]).to.be(undefined);
        });
    });

    it('should scroll across multiple pages', function () {
      const oneResult = { 'took': 1, 'timed_out': false, '_shards': { 'total': 1, 'successful': 1, 'failed': 0 }, 'hits': { 'total': 2, 'max_score': 0.0, 'hits': ['one'] } }; // eslint-disable-line max-len
      scroll = sinon.stub().returns(Promise.resolve({ data: oneResult }));
      return scanner.scanAndMap(null, { pageSize: 1 })
        .then(function (response) {
          expect(scroll.calledTwice);
          expect(response.hits.length).to.be(2);
          expect(scroll.getCall(1).args[0].scrollId).to.be('abc');
          expect(scroll.getCall(0).args[0].scrollId).to.be('abc');
        });
    });

    afterEach(function () {
      httpPost.restore();
    });
  });

});
