
import sinon from 'sinon';
import expect from 'expect.js';
import { PersistedLog } from './';

const historyName = 'testHistory';
const historyLimit = 10;
const payload = [
  { first: 'clark', last: 'kent' },
  { first: 'peter', last: 'parker' },
  { first: 'bruce', last: 'wayne' }
];

describe('PersistedLog', function () {

  let storage;
  beforeEach(function () {
    storage = {
      get: sinon.stub(),
      set: sinon.stub(),
      remove: sinon.spy(),
      clear: sinon.spy()
    };
  });

  describe('expected API', function () {
    test('has expected methods', function () {
      const log = new PersistedLog(historyName);

      expect(log.add).to.be.a('function');
      expect(log.get).to.be.a('function');
    });
  });

  describe('internal functionality', function () {
    test('reads from storage', function () {
      new PersistedLog(historyName, {}, storage);

      expect(storage.get.calledOnce).to.be(true);
      expect(storage.get.calledWith(historyName)).to.be(true);
    });

    test('writes to storage', function () {
      const log = new PersistedLog(historyName, {}, storage);
      const newItem = { first: 'diana', last: 'prince' };

      const data = log.add(newItem);

      expect(storage.set.calledOnce).to.be(true);
      expect(data).to.eql([newItem]);
    });
  });

  describe('persisting data', function () {
    test('fetches records from storage', function () {
      storage.get.returns(payload);
      const log = new PersistedLog(historyName, {}, storage);

      const items = log.get();
      expect(items.length).to.equal(3);
      expect(items).to.eql(payload);
    });

    test('prepends new records', function () {
      storage.get.returns(payload.slice(0));
      const log = new PersistedLog(historyName, {}, storage);
      const newItem = { first: 'selina', last: 'kyle' };

      const items = log.add(newItem);
      expect(items.length).to.equal(payload.length + 1);
      expect(items[0]).to.eql(newItem);
    });
  });

  describe('stack options', function () {
    test('should observe the maxLength option', function () {
      const bulkData = [];

      for (let i = 0; i < historyLimit; i++) {
        bulkData.push(['record ' + i]);
      }
      storage.get.returns(bulkData);

      const log = new PersistedLog(historyName, { maxLength: historyLimit }, storage);
      log.add(['new array 1']);
      const items = log.add(['new array 2']);

      expect(items.length).to.equal(historyLimit);
    });

    test('should observe the filterDuplicates option', function () {
      storage.get.returns(payload.slice(0));
      const log = new PersistedLog(historyName, { filterDuplicates: true }, storage);
      const newItem = payload[1];

      const items = log.add(newItem);
      expect(items.length).to.equal(payload.length);
    });

    test('should truncate the list upon initialization if too long', () => {
      storage.get.returns(payload.slice(0));
      const log = new PersistedLog(historyName, { maxLength: 1 }, storage);
      const items = log.get();
      expect(items.length).to.equal(1);
    });

    test('should allow a maxLength of 0', () => {
      storage.get.returns(payload.slice(0));
      const log = new PersistedLog(historyName, { maxLength: 0 }, storage);
      const items = log.get();
      expect(items.length).to.equal(0);
    });
  });
});
