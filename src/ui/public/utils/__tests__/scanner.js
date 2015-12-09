var Scanner = require('ui/utils/scanner');
var expect = require('expect.js');
var elasticsearch = require('elasticsearch-browser');
var sinon = require('sinon');

var es = new elasticsearch.Client({
  host: 'http://localhost:9210',
});


describe('Scanner', function () {
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
    let mockSearch = {'_scroll_id':'abc','took':1,'timed_out':false,'_shards':{'total':1,'successful':1,'failed':0},'hits':{'total':2,'max_score':0.0,'hits':[]}}; // eslint-disable-line max-len
    let mockScroll = {'took':1,'timed_out':false,'_shards':{'total':1,'successful':1,'failed':0},'hits':{'total':2,'max_score':0.0,'hits':['one', 'two']}}; // eslint-disable-line max-len

    beforeEach(function () {
      scanner = new Scanner(es, {
        index: 'foo',
        type: 'bar'
      });
      search = sinon.stub(scanner.client, 'search', (req, cb) => cb(null, mockSearch));
      scroll = sinon.stub(scanner.client, 'scroll', (req, cb) => cb(null, mockScroll));
    });

    it('should search and then scroll for results', function () {
      return scanner.scanAndMap('')
      .then(function (error, response) {
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
      return scanner.scanAndMap(null, {docCount: 1}, function (hit) {
        return hit.toUpperCase();
      })
      .then(function (response) {
        expect(response.hits[0]).to.be('ONE');
        expect(response.hits[1]).to.be(undefined);
      });
    });

    it('should scroll across multiple pages', function () {
      scroll.restore();
      let oneResult = {'took':1,'timed_out':false,'_shards':{'total':1,'successful':1,'failed':0},'hits':{'total':2,'max_score':0.0,'hits':['one']}}; // eslint-disable-line max-len
      scroll = sinon.stub(scanner.client, 'scroll', (req, cb) => cb(null, oneResult));
      return scanner.scanAndMap(null, {pageSize: 1})
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
