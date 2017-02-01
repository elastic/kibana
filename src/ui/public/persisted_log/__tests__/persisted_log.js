
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/persisted_log';

let storage;
let config;
let PersistedLog;

let historyName = 'testHistory';
let historyLimit = 10;
let payload = [
  { first: 'clark', last: 'kent' },
  { first: 'peter', last: 'parker' },
  { first: 'bruce', last: 'wayne' }
];


function init() {
  ngMock.module('kibana/persisted_log', function ($provide) {
    // mock storage service
    $provide.service('localStorage', function () {
      this.get = sinon.stub();
      this.set = sinon.stub();
      this.remove = sinon.spy();
      this.clear = sinon.spy();
    });
  });

  ngMock.inject(function ($injector) {
    storage = $injector.get('localStorage');
    PersistedLog = $injector.get('PersistedLog');
  });
}

describe('PersistedLog', function () {
  beforeEach(function () {
    init();
  });

  describe('expected API', function () {
    it('has expected methods', function () {
      let log = new PersistedLog(historyName);

      expect(log.add).to.be.a('function');
      expect(log.get).to.be.a('function');
    });
  });

  describe('internal functionality', function () {
    it('reads from storage', function () {
      let log = new PersistedLog(historyName);

      expect(storage.get.calledOnce).to.be(true);
      expect(storage.get.calledWith(historyName)).to.be(true);
    });

    it('writes to storage', function () {
      let log = new PersistedLog(historyName);
      let newItem = { first: 'diana', last: 'prince' };

      let data = log.add(newItem);

      expect(storage.set.calledOnce).to.be(true);
      expect(data).to.eql([newItem]);
    });
  });

  describe('persisting data', function () {
    it('fetches records from storage', function () {
      storage.get.returns(payload);
      let log = new PersistedLog(historyName);

      let items = log.get();
      expect(items.length).to.equal(3);
      expect(items).to.eql(payload);
    });

    it('prepends new records', function () {
      storage.get.returns(payload.slice(0));
      let log = new PersistedLog(historyName);
      let newItem = { first: 'selina', last: 'kyle' };

      let items = log.add(newItem);
      expect(items.length).to.equal(payload.length + 1);
      expect(items[0]).to.eql(newItem);
    });
  });

  describe('stack options', function () {
    it('should observe the maxLength option', function () {
      let bulkData = [];

      for (let i = 0; i < historyLimit; i++) {
        bulkData.push(['record ' + i]);
      }
      storage.get.returns(bulkData);

      let log = new PersistedLog(historyName, { maxLength: historyLimit });
      log.add(['new array 1']);
      let items = log.add(['new array 2']);

      expect(items.length).to.equal(historyLimit);
    });

    it('should observe the filterDuplicates option', function () {
      storage.get.returns(payload.slice(0));
      let log = new PersistedLog(historyName, { filterDuplicates: true });
      let newItem = payload[1];

      let items = log.add(newItem);
      expect(items.length).to.equal(payload.length);
    });

    it ('should truncate the list upon initialization if too long', () => {
      storage.get.returns(payload.slice(0));
      let log = new PersistedLog(historyName, { maxLength: 1 });
      let items = log.get();
      expect(items.length).to.equal(1);
    });

    it('should allow a maxLength of 0', () => {
      storage.get.returns(payload.slice(0));
      let log = new PersistedLog(historyName, { maxLength: 0 });
      let items = log.get();
      expect(items.length).to.equal(0);
    });
  });
});
