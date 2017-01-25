import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
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
      try {
        confirmModal('hi', { onConfirm: _.noop });
        expect(true).to.be(false);
      } catch (error) {
        expect(error).to.not.be(undefined);
      }
    });

    it('when no custom noConfirm function is passed', function () {
      try {
        confirmModal('hi', { confirmButtonText: 'bye' });
        expect(true).to.be(false);
      } catch (error) {
        expect(error).to.not.be(undefined);
      }
    });

    it('when showClose is on but title is not given', function () {
      try {
        confirmModal('hi', { customConfirmButton: 'b', onConfirm: _.noop, showClose: true });
        expect(true).to.be(false);
      } catch (error) {
        expect(error).to.not.be(undefined);
      }
    });
  });

  it('shows the message', function () {
    const myMessage = 'Hi, how are you?';
    confirmModal(myMessage, { confirmButtonText: 'GREAT!', onConfirm: _.noop });

    $rootScope.$digest();
    const message = findByDataTestSubj('confirmModalBodyText')[0].innerText;
    expect(message).to.equal(myMessage);
  });

  it('shows custom text', function () {
    const confirmModalOptions = {
      confirmButtonText: 'Troodon',
      cancelButtonText: 'Dilophosaurus',
      title: 'Dinosaurs',
      onConfirm: _.noop
    };
    confirmModal('What\'s your favorite dinosaur?', confirmModalOptions);

    $rootScope.$digest();
    const confirmButtonText = findByDataTestSubj('confirmModalConfirmButton')[0].innerText;
    expect(confirmButtonText).to.equal('Troodon');
    const cancelButtonText = findByDataTestSubj('confirmModalCancelButton')[0].innerText;
    expect(cancelButtonText).to.equal('Dilophosaurus');
    const titleText = findByDataTestSubj('confirmModalTitleText')[0].innerText;
    expect(titleText).to.equal('Dinosaurs');
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
});
