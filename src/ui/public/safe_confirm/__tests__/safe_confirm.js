describe('ui/safe_confirm', function () {
  var sinon = require('sinon');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var $rootScope;
  var $window;
  var $timeout;
  var message;
  var safeConfirm;
  var promise;

  beforeEach(function () {
    ngMock.module('kibana', function ($provide) {
      $provide.value('$window', {
        confirm: sinon.stub().returns(true)
      });
    });

    ngMock.inject(function ($injector) {
      safeConfirm = $injector.get('safeConfirm');
      $rootScope = $injector.get('$rootScope');
      $window = $injector.get('$window');
      $timeout = $injector.get('$timeout');
    });

    message = 'woah';

    promise = safeConfirm(message);
  });

  context('before timeout completes', function () {
    it('$window.confirm is not invoked', function () {
      expect($window.confirm.called).to.be(false);
    });
    it('returned promise is not resolved', function () {
      var isResolved = false;
      function markAsResolved() {
        isResolved = true;
      }
      promise.then(markAsResolved, markAsResolved);
      $rootScope.$apply(); // attempt to resolve the promise, but this won't flush $timeout promises
      expect(isResolved).to.be(false);
    });
  });

  context('after timeout completes', function () {
    it('$window.confirm is invoked with message', function () {
      $timeout.flush();
      expect($window.confirm.calledWith(message)).to.be(true);
    });

    context('when confirmed', function () {
      it('promise is fulfilled with true', function () {
        $timeout.flush();

        var value;
        promise.then(function (v) {
          value = v;
        });
        $rootScope.$apply();

        expect(value).to.be(true);
      });
    });

    context('when canceled', function () {
      it('promise is rejected with false', function () {
        $window.confirm.returns(false); // must be set before $timeout.flush()
        $timeout.flush();

        var value;
        promise.then(null, function (v) {
          value = v;
        });
        $rootScope.$apply();

        expect(value).to.be(false);
      });
    });
  });
});
