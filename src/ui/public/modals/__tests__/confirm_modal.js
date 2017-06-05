import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import _ from 'lodash';

describe('ui/modals/confirm_modal', function () {
  let confirmModal;
  let $rootScope;

  beforeEach(function () {
    ngMock.module('kibana');
    ngMock.inject(function ($injector) {
      confirmModal = $injector.get('confirmModal');
      $rootScope = $injector.get('$rootScope');
    });
  });

  function findByDataTestSubj(dataTestSubj) {
    return angular.element(document.body).find(`[data-test-subj=${dataTestSubj}]`);
  }

  afterEach(function () {
    const confirmButton = findByDataTestSubj('confirmModalConfirmButton');
    if (confirmButton) {
      angular.element(confirmButton).click();
    }
  });

  describe('throws an exception', function () {
    it('when no custom confirm button passed', function () {
      expect(() => confirmModal('hi', { onConfirm: _.noop })).to.throwError();
    });

    it('when no custom noConfirm function is passed', function () {
      expect(() => confirmModal('hi', { confirmButtonText: 'bye' })).to.throwError();
    });

    it('when showClose is on but title is not given', function () {
      const options = { customConfirmButton: 'b', onConfirm: _.noop, showClose: true };
      expect(() => confirmModal('hi', options)).to.throwError();
    });
  });

  it('shows the message', function () {
    const myMessage = 'Hi, how are you?';
    confirmModal(myMessage, { confirmButtonText: 'GREAT!', onConfirm: _.noop });

    $rootScope.$digest();
    const message = findByDataTestSubj('confirmModalBodyText')[0].innerText.trim();
    expect(message).to.equal(myMessage);
  });

  describe('shows custom text', function () {
    const confirmModalOptions = {
      confirmButtonText: 'Troodon',
      cancelButtonText: 'Dilophosaurus',
      title: 'Dinosaurs',
      onConfirm: _.noop
    };

    it('for confirm button', () => {
      confirmModal('What\'s your favorite dinosaur?', confirmModalOptions);
      $rootScope.$digest();
      const confirmButtonText = findByDataTestSubj('confirmModalConfirmButton')[0].innerText.trim();
      expect(confirmButtonText).to.equal('Troodon');
    });

    it('for cancel button', () => {
      confirmModal('What\'s your favorite dinosaur?', confirmModalOptions);
      $rootScope.$digest();
      const cancelButtonText = findByDataTestSubj('confirmModalCancelButton')[0].innerText.trim();
      expect(cancelButtonText).to.equal('Dilophosaurus');
    });

    it('for title text', () => {
      confirmModal('What\'s your favorite dinosaur?', confirmModalOptions);
      $rootScope.$digest();
      const titleText = findByDataTestSubj('confirmModalTitleText')[0].innerText.trim();
      expect(titleText).to.equal('Dinosaurs');
    });
  });

  describe('callbacks are called:', function () {
    const confirmCallback = sinon.spy();
    const cancelCallback = sinon.spy();

    const confirmModalOptions = {
      confirmButtonText: 'bye',
      onConfirm: confirmCallback,
      onCancel: cancelCallback,
      title: 'hi'
    };

    beforeEach(() => {
      confirmCallback.reset();
      cancelCallback.reset();
    });

    it('onCancel', function () {
      confirmModal('hi', confirmModalOptions);
      $rootScope.$digest();
      findByDataTestSubj('confirmModalCancelButton').click();

      expect(confirmCallback.called).to.be(false);
      expect(cancelCallback.called).to.be(true);
    });

    it('onConfirm', function () {
      confirmModal('hi', confirmModalOptions);
      $rootScope.$digest();
      findByDataTestSubj('confirmModalConfirmButton').click();

      expect(confirmCallback.called).to.be(true);
      expect(cancelCallback.called).to.be(false);
    });
  });
});
