import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

describe('ui/modals/confirm_modal_promise', function () {

  let $rootScope;
  let message;
  let confirmModalPromise;
  let promise;

  beforeEach(function () {
    ngMock.module('kibana');
    ngMock.inject(function ($injector) {
      confirmModalPromise = $injector.get('confirmModalPromise');
      $rootScope = $injector.get('$rootScope');
    });

    message = 'woah';

    promise = confirmModalPromise(message, { confirmButtonText: 'click me' });
  });

  afterEach(function () {
    const confirmButton = angular.element(document.body).find('[data-test-subj=confirmModalConfirmButton]');
    if (confirmButton) {
      $rootScope.$digest();
      angular.element(confirmButton).click();
    }
  });

  describe('before timeout completes', function () {
    it('returned promise is not resolved', function () {
      const callback = sinon.spy();
      promise.then(callback, callback);
      $rootScope.$apply();
      expect(callback.called).to.be(false);
    });
  });

  describe('after timeout completes', function () {
    it('confirmation dialogue is loaded to dom with message', function () {
      $rootScope.$digest();
      const confirmModalElement = angular.element(document.body).find('[data-test-subj=confirmModal]');
      expect(confirmModalElement).to.not.be(undefined);

      const htmlString = confirmModalElement[0].innerHTML;

      expect(htmlString.indexOf(message)).to.be.greaterThan(0);
    });

    describe('when confirmed', function () {
      it('promise is fulfilled with true', function () {
        const confirmCallback = sinon.spy();
        const cancelCallback = sinon.spy();

        promise.then(confirmCallback, cancelCallback);
        $rootScope.$digest();
        const confirmButton = angular.element(document.body).find('[data-test-subj=confirmModalConfirmButton]');

        confirmButton.click();
        expect(confirmCallback.called).to.be(true);
        expect(cancelCallback.called).to.be(false);
      });
    });

    describe('when canceled', function () {
      it('promise is rejected with false', function () {
        const confirmCallback = sinon.spy();
        const cancelCallback = sinon.spy();
        promise.then(confirmCallback, cancelCallback);

        $rootScope.$digest();
        const noButton = angular.element(document.body).find('[data-test-subj=confirmModalCancelButton]');
        noButton.click();

        expect(cancelCallback.called).to.be(true);
        expect(confirmCallback.called).to.be(false);
      });
    });

    describe('error is thrown', function () {
      it('when no confirm button text is used', function () {
        try {
          confirmModalPromise(message);
          expect(false).to.be(true);
        } catch (error) {
          expect(error).to.not.be(undefined);
        }
      });
    });
  });
});
