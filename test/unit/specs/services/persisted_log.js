define(function (require) {
  var sinon = require('sinon/sinon');

  var storage;
  var config;
  var PersistedLog;

  var historyName = 'testHistory';
  var historyLimit = 10;
  var payload = [
    { first: 'clark', last: 'kent' },
    { first: 'peter', last: 'parker' },
    { first: 'bruce', last: 'wayne' }
  ];

  require('components/persisted_log/persisted_log');

  function init() {
    module('kibana/persisted_log', function ($provide) {
      // mock storage service
      $provide.service('localStorage', function () {
        this.get = sinon.stub();
        this.set = sinon.stub();
        this.remove = sinon.spy();
        this.clear = sinon.spy();
      });
    });

    inject(function ($injector) {
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
        var log = new PersistedLog(historyName);

        expect(log.add).to.be.a('function');
        expect(log.get).to.be.a('function');
      });
    });

    describe('internal functionality', function () {
      it('reads from storage', function () {
        var log = new PersistedLog(historyName);

        expect(storage.get.calledOnce).to.be(true);
        expect(storage.get.calledWith(historyName)).to.be(true);
      });

      it('writes to storage', function () {
        var log = new PersistedLog(historyName);
        var newItem = { first: 'diana', last: 'prince' };

        var data = log.add(newItem);

        expect(storage.set.calledOnce).to.be(true);
        expect(data).to.eql([newItem]);
      });
    });

    describe('persisting data', function () {
      it('fetches records from storage', function () {
        storage.get.returns(payload);
        var log = new PersistedLog(historyName);

        var items = log.get();
        expect(items.length).to.equal(3);
        expect(items).to.eql(payload);
      });

      it('prepends new records', function () {
        storage.get.returns(payload.slice(0));
        var log = new PersistedLog(historyName);
        var newItem = { first: 'selina', last: 'kyle' };

        var items = log.add(newItem);
        expect(items.length).to.equal(payload.length + 1);
        expect(items[0]).to.eql(newItem);
      });
    });

    describe('stack options', function () {
      it('should observe the maxLength option', function () {
        var bulkData = [];

        for (var i = 0; i < historyLimit; i++) {
          bulkData.push(['record ' + i]);
        }
        storage.get.returns(bulkData);

        var log = new PersistedLog(historyName, { maxLength: historyLimit });
        log.add(['new array 1']);
        var items = log.add(['new array 2']);

        expect(items.length).to.equal(historyLimit);
      });

      it('should observe the filterDuplicates option', function () {
        storage.get.returns(payload.slice(0));
        var log = new PersistedLog(historyName, { filterDuplicates: true });
        var newItem = payload[1];

        var items = log.add(newItem);
        expect(items.length).to.equal(payload.length);
      });
    });
  });
});