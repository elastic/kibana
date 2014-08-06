define(function (require) {
  var sinon = require('sinon/sinon');

  var storage;
  var config;
  var history;

  var historyName = 'testHistory';
  var historyLimit = 10;
  var payload = [
    { first: 'clark', last: 'kent' },
    { first: 'peter', last: 'parker' },
    { first: 'bruce', last: 'wayne' }
  ];

  require('components/history/history');

  function init() {
    module('kibana/history', function ($provide) {
      // mock storage service
      $provide.service('storage', function () {
        this.get = sinon.stub();
        this.set = sinon.stub();
        this.remove = sinon.spy();
        this.clear = sinon.spy();
      });

      // mock config service
      $provide.service('config', function () {
        this.get = sinon.stub().returns(historyLimit);
      });
    });

    inject(function ($injector) {
      storage = $injector.get('storage');
      config = $injector.get('config');
      history = $injector.get('history');
    });
  }

  describe('HistoryFactory', function () {
    beforeEach(function () {
      init();
    });

    describe('expected API', function () {
      it('has expected methods', function () {
        var h = new history(historyName);

        expect(h.add).to.be.a('function');
        expect(h.get).to.be.a('function');
      });
    });

    describe('internal functionality', function () {
      it('reads from storage', function () {
        var h = new history(historyName);

        expect(storage.get.calledOnce).to.be(true);
        expect(storage.get.calledWith(historyName)).to.be(true);
      });

      it('writes to storage', function () {
        var h = new history(historyName);
        var newItem = { first: 'diana', last: 'prince' };

        var data = h.add(newItem);

        expect(storage.set.calledOnce).to.be(true);
        expect(data).to.eql([newItem]);
      });
    });

    describe('persisting data', function () {
      it('fetches records from storage', function () {
        storage.get.returns(payload);
        var h = new history(historyName);

        var items = h.get();
        expect(items.length).to.equal(3);
        expect(items).to.eql(payload);
      });

      it('prepends new records', function () {
        storage.get.returns(payload);
        var h = new history(historyName);
        var newItem = { first: 'selina', last: 'kyle' };

        var items = h.add(newItem);
        expect(items.length).to.equal(4);
        expect(items[0]).to.eql(newItem);
      });
    });
  });
});