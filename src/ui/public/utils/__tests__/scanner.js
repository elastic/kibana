import { Scanner } from 'ui/utils/scanner';
import expect from 'expect.js';
import Bluebird from 'bluebird';
import 'elasticsearch-browser';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import url from 'url';

import { esTestServerUrlParts } from '../../../../../test/es_test_server_url_parts';

describe('Scanner', function () {
  let es;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (esFactory) {
    es = esFactory({
      host: url.format(esTestServerUrlParts),
      defer: function () {
        return Bluebird.defer();
      }
    });
  }));

  afterEach(function () {
    es.close();
    es = null;
  });

  describe('initialization', function () {
    it('should throw errors if missing arguments on initialization', function () {
      expect(() => new Scanner()).to.throwError();
      expect(() => new Scanner(es)).to.throwError();
      expect(() => new Scanner(es, {
        index: 'foo',
        type: 'bar'
      })).not.to.throwError();
    });
  });

  describe('scan', function () {
    let search;
    let scroll;
    let scanner;
    const mockSearch = { '_scroll_id':'abc','took':1,'timed_out':false,'_shards':{ 'total':1,'successful':1,'failed':0 },'hits':{ 'total':2,'max_score':0.0,'hits':[] } }; // eslint-disable-line max-len
    const mockScroll = { 'took':1,'timed_out':false,'_shards':{ 'total':1,'successful':1,'failed':0 },'hits':{ 'total':2,'max_score':0.0,'hits':['one', 'two'] } }; // eslint-disable-line max-len

    beforeEach(function () {
      scanner = new Scanner(es, {
        index: 'foo',
        type: 'bar'
      });
      search = sinon.stub(scanner.client, 'search', (req, cb) => cb(null, mockSearch));
      scroll = sinon.stub(scanner.client, 'scroll', (req, cb) => cb(null, mockScroll));
    });

    it('should reject when an error occurs', function () {
      search.restore();
      search = sinon.stub(scanner.client, 'search', (req, cb) => cb(new Error('fail.')));
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
        return hit.toUpperCase();
      })
      .then(function (response) {
        expect(response.hits[0]).to.be('ONE');
        expect(response.hits[1]).to.be('TWO');
      });
    });

    it('should only return the requested number of documents', function () {
      return scanner.scanAndMap(null, { docCount: 1 }, function (hit) {
        return hit.toUpperCase();
      })
      .then(function (response) {
        expect(response.hits[0]).to.be('ONE');
        expect(response.hits[1]).to.be(undefined);
      });
    });

    it('should scroll across multiple pages', function () {
      scroll.restore();
      const oneResult = { 'took':1,'timed_out':false,'_shards':{ 'total':1,'successful':1,'failed':0 },'hits':{ 'total':2,'max_score':0.0,'hits':['one'] } }; // eslint-disable-line max-len
      scroll = sinon.stub(scanner.client, 'scroll', (req, cb) => cb(null, oneResult));
      return scanner.scanAndMap(null, { pageSize: 1 })
      .then(function (response) {
        expect(scroll.calledTwice);
        expect(response.hits.length).to.be(2);
        expect(scroll.getCall(1).args[0].scrollId).to.be('abc');
        expect(scroll.getCall(0).args[0].scrollId).to.be('abc');
      });
    });

    afterEach(function () {
      search.restore();
      scroll.restore();
    });
  });

});
