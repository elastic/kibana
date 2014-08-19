define(function (require) {
  var sinon = require('sinon/sinon');
  var Promise = require('bluebird');

  var notify;

  function init() {
    module('kibana', function ($provide) {
      $provide.factory('Notifier', function () {
        function NotifierMock(opts) {
          this.opts = opts;
        }

        var eventSpy = NotifierMock.prototype.eventSpy = sinon.spy();
        NotifierMock.prototype.event = sinon.stub().returns(eventSpy);

        return NotifierMock;
      });
    });

    inject(function ($injector, Private) {
      var Notifier = $injector.get('Notifier');
      notify = new Notifier();
    });
  }

  describe.only('segmented fetch', function () {
    beforeEach(init);

    describe('abort', function () {
      it('should abort the existing fetch');
      it('should abort the es promise');
      it('should clear the notification');
    });
  });
});