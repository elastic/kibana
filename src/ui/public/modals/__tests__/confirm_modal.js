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
    const message = findByDataTestSubj('confirmModalBodyText')[0].innerText;
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
      const confirmButtonText = findByDataTestSubj('confirmModalConfirmButton')[0].innerText;
      expect(confirmButtonText).to.equal('Troodon');
    });

    it('for cancel button', () => {
      confirmModal('What\'s your favorite dinosaur?', confirmModalOptions);
      $rootScope.$digest();
      const cancelButtonText = findByDataTestSubj('confirmModalCancelButton')[0].innerText;
      expect(cancelButtonText).to.equal('Dilophosaurus');
    });

    it('for title text', () => {
      confirmModal('What\'s your favorite dinosaur?', confirmModalOptions);
      $rootScope.$digest();
      const titleText = findByDataTestSubj('confirmModalTitleText')[0].innerText;
      expect(titleText).to.equal('Dinosaurs');
    });
  });

  describe('x icon', function () {
    it('is visible when showClose is true', function () {
      const confirmModalOptions = {
        confirmButtonText: 'bye',
        onConfirm: _.noop,
        showClose: true,
        title: 'hi'
      };
      confirmModal('hi', confirmModalOptions);

      $rootScope.$digest();
      const xIcon = findByDataTestSubj('confirmModalCloseButton');
      expect(xIcon.length).to.be(1);
    });

    it('is not visible when showClose is false', function () {
      const confirmModalOptions = {
        confirmButtonText: 'bye',
        onConfirm: _.noop,
        title: 'hi',
        showClose: false
      };
      confirmModal('hi', confirmModalOptions);

      $rootScope.$digest();
      const xIcon = findByDataTestSubj('confirmModalCloseButton');
      expect(xIcon.length).to.be(0);
    });
  });

  describe('callbacks are called:', function () {
    const confirmCallback = sinon.spy();
    const closeCallback = sinon.spy();
    const cancelCallback = sinon.spy();

    const confirmModalOptions = {
      confirmButtonText: 'bye',
      onConfirm: confirmCallback,
      onCancel: cancelCallback,
      onClose: closeCallback,
      title: 'hi',
      showClose: true
    };

    beforeEach(() => {
      confirmCallback.reset();
      closeCallback.reset();
      cancelCallback.reset();
    });

    it('onClose', function () {
      confirmModal('hi', confirmModalOptions);
      $rootScope.$digest();
      findByDataTestSubj('confirmModalCloseButton').click();

      expect(closeCallback.called).to.be(true);
      expect(confirmCallback.called).to.be(false);
      expect(cancelCallback.called).to.be(false);
    });

    it('onCancel', function () {
      confirmModal('hi', confirmModalOptions);
      $rootScope.$digest();
      findByDataTestSubj('confirmModalCancelButton').click();

      expect(closeCallback.called).to.be(false);
      expect(confirmCallback.called).to.be(false);
      expect(cancelCallback.called).to.be(true);
    });

    it('onConfirm', function () {
      confirmModal('hi', confirmModalOptions);
      $rootScope.$digest();
      findByDataTestSubj('confirmModalConfirmButton').click();

      expect(closeCallback.called).to.be(false);
      expect(confirmCallback.called).to.be(true);
      expect(cancelCallback.called).to.be(false);
    });


    it('onClose defaults to onCancel if not specified', function () {
      const confirmModalOptions = {
        confirmButtonText: 'bye',
        onConfirm: confirmCallback,
        onCancel: cancelCallback,
        title: 'hi',
        showClose: true
      };

      confirmModal('hi', confirmModalOptions);
      $rootScope.$digest();
      findByDataTestSubj('confirmModalCloseButton').click();

      expect(confirmCallback.called).to.be(false);
      expect(cancelCallback.called).to.be(true);
    });

    it('onKeyDown detects ESC and calls onCancel', function () {
      const confirmModalOptions = {
        confirmButtonText: 'bye',
        onConfirm: confirmCallback,
        onCancel: cancelCallback,
        title: 'hi'
      };

      confirmModal('hi', confirmModalOptions);

      const e = angular.element.Event('keydown'); // eslint-disable-line new-cap
      e.keyCode = 27;
      angular.element(document.body).trigger(e);

      expect(cancelCallback.called).to.be(true);
    });

    it('onKeyDown ignores keys other than ESC', function () {
      const confirmModalOptions = {
        confirmButtonText: 'bye',
        onConfirm: confirmCallback,
        onCancel: cancelCallback,
        title: 'hi'
      };

      confirmModal('hi', confirmModalOptions);

      const e = angular.element.Event('keydown'); // eslint-disable-line new-cap
      e.keyCode = 50;
      angular.element(document.body).trigger(e);

      expect(cancelCallback.called).to.be(false);
    });
  });
});
