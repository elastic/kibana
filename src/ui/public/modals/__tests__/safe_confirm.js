import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';

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
      let isResolved = false;
      function markAsResolved() {
        isResolved = true;
      }
      promise.then(markAsResolved, markAsResolved);
      $rootScope.$apply();
      expect(isResolved).to.be(false);
    });
  });

  context('after timeout completes', function () {
    it('confirmation dialogue is loaded to dom with message', function () {
      $rootScope.$digest();
      const confirmationDialogueElement = angular.element(document.body).find('[data-test-subj=confirmModal]');
      expect(!!confirmationDialogueElement).to.be(true);
      const htmlString = confirmationDialogueElement[0].innerHTML;

      expect(htmlString.indexOf(message)).to.be.greaterThan(0);
    });

    context('when confirmed', function () {
      it('promise is fulfilled with true', function () {

        let confirmed = false;
        promise.then(() => {
          confirmed = true;
        });
        const confirmButton = angular.element(document.body).find('[data-test-subj=confirmModalConfirmButton]');

        $rootScope.$digest();
        confirmButton.click();

        expect(confirmed).to.be(true);
      });
    });

    context('when canceled', function () {
      it('promise is rejected with false', function () {
        let rejected = false;
        promise.then(null, () => { rejected = true; });
        const noButton = angular.element(document.body).find('[data-test-subj=confirmModalCancelButton]');

        $rootScope.$digest();
        noButton.click();

        expect(rejected).to.be(true);
      });
    });
  });
});
