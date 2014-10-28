define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');

  var debounce;
  var $timeout;
  var $timeoutSpy;

  function init() {
    module('kibana');

    inject(function ($injector, _$timeout_) {
      $timeout = _$timeout_;
      $timeoutSpy = sinon.spy($timeout);

      debounce = $injector.get('debounce');
    });
  }

  describe('debounce service', function () {
    var spy;
    beforeEach(function () {
      spy = sinon.spy(function () {});
      init();
    });

    describe('API', function () {
      it('should have a cancel method', function () {
        var bouncer = debounce(function () {}, 100);
        expect(bouncer).to.have.property('cancel');
      });
    });

    describe('delayed execution', function () {
      it('should delay execution', function () {
        var bouncer = debounce(spy, 100);
        bouncer();
        expect(spy.callCount).to.be(0);
        $timeout.flush();
        expect(spy.callCount).to.be(1);
      });

      it('should fire on leading edge', function () {
        var bouncer = debounce(spy, 100, { leading: true });
        bouncer();
        expect(spy.callCount).to.be(1);
        $timeout.flush();
        expect(spy.callCount).to.be(2);
      });

      it('should only fire on leading edge', function () {
        var bouncer = debounce(spy, 100, { leading: true, trailing: false });
        bouncer();
        expect(spy.callCount).to.be(1);
        $timeout.flush();
        expect(spy.callCount).to.be(1);
      });

      it('should reset delayed execution', function (done) {
        var cancelSpy = sinon.spy($timeout, 'cancel');
        var bouncer = debounce(spy, 100);
        bouncer();
        setTimeout(function () {
          bouncer();
          expect(spy.callCount).to.be(0);
          $timeout.flush();
          expect(spy.callCount).to.be(1);
          expect(cancelSpy.callCount).to.be(1);
          done();
        }, 1);
      });
    });

    describe('cancel', function () {
      it('should cancel the $timeout', function () {
        var cancelSpy = sinon.spy($timeout, 'cancel');
        var bouncer = debounce(spy, 100);
        bouncer();
        bouncer.cancel();
        expect(cancelSpy.callCount).to.be(1);
        $timeout.verifyNoPendingTasks(); // throws if pending timeouts
      });
    });
  });
});
