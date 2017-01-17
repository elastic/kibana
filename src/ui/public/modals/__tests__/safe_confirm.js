import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

describe('ui/modals/safe_confirm', function () {

  let $rootScope;
  let message;
  let safeConfirm;
  let promise;

  beforeEach(function () {
    ngMock.module('kibana');
    ngMock.inject(function ($injector) {
      safeConfirm = $injector.get('safeConfirm');
      $rootScope = $injector.get('$rootScope');
    });

    message = 'woah';

    promise = safeConfirm(message);
  });

  afterEach(function () {
    const confirmButton = angular.element(document.body).find('[data-test-subj=confirmModalConfirmButton]');
    if (confirmButton) {
      $rootScope.$digest();
      angular.element(confirmButton).click();
    }
  });

  context('before timeout completes', function () {
    it('returned promise is not resolved', function () {
      const callback = sinon.spy();
      promise.then(callback, callback);
      $rootScope.$apply();
      expect(callback.called).to.be(false);
    });
  });

  context('after timeout completes', function () {
    it('confirmation dialogue is loaded to dom with message', function () {
      $rootScope.$digest();
      const confirmModalElement = angular.element(document.body).find('[data-test-subj=confirmModal]');
      expect(confirmModalElement).to.not.be(undefined);

      const htmlString = confirmModalElement[0].innerHTML;

      expect(htmlString.indexOf(message)).to.be.greaterThan(0);
    });

    context('when confirmed', function () {
      it('promise is fulfilled with true', function () {
        const confirmCallback = sinon.spy();
        const cancelCallback = sinon.spy();

        promise.then(confirmCallback, cancelCallback);
        const confirmButton = angular.element(document.body).find('[data-test-subj=confirmModalConfirmButton]');

        $rootScope.$digest();
        confirmButton.click();

        expect(confirmCallback.called).to.be(true);
        expect(cancelCallback.called).to.be(false);
      });
    });

    context('when canceled', function () {
      it('promise is rejected with false', function () {
        const confirmCallback = sinon.spy();
        const cancelCallback = sinon.spy();
        promise.then(confirmCallback, cancelCallback);

        const noButton = angular.element(document.body).find('[data-test-subj=confirmModalCancelButton]');

        $rootScope.$digest();
        noButton.click();

        expect(cancelCallback.called).to.be(true);
        expect(confirmCallback.called).to.be(false);
      });
    });
  });
});
