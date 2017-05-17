import React from 'react';
import sinon from 'sinon';
import { mount, render } from 'enzyme';

import { requiredProps } from '../../test/required_props';

import {
  CANCEL_BUTTON, CONFIRM_BUTTON, KuiConfirmModal,
} from './confirm_modal';

let onConfirm;
let onCancel;

beforeEach(() => {
  onConfirm = sinon.spy();
  onCancel = sinon.spy();
});

test('renders KuiConfirmModal', () => {
  const component = render(<KuiConfirmModal
    message="This is a confirmation modal example"
    title="A confirmation modal"
    onCancel={() => {}}
    onConfirm={onConfirm}
    cancelButtonText="Cancel Button Text"
    confirmButtonText="Confirm Button Text"
    { ...requiredProps }
  />);
  expect(component).toMatchSnapshot();
});

test('onConfirm', () => {
  const component = mount(<KuiConfirmModal
    message="This is a confirmation modal example"
    title="A confirmation modal"
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText="Cancel"
    confirmButtonText="Confirm"
    { ...requiredProps }
  />);
  component.find('[data-test-subj="confirmModalConfirmButton"]').simulate('click');
  sinon.assert.calledOnce(onConfirm);
  sinon.assert.notCalled(onCancel);
});

describe('onCancel', () => {
  test('triggerd by click', () => {
    const component = mount(<KuiConfirmModal
      message="This is a confirmation modal example"
      title="A confirmation modal"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel"
      confirmButtonText="Confirm"
      { ...requiredProps }
    />);
    component.find('[data-test-subj="confirmModalCancelButton"]').simulate('click');
    sinon.assert.notCalled(onConfirm);
    sinon.assert.calledOnce(onCancel);
  });

  test('triggered by esc key', () => {
    const component = mount(<KuiConfirmModal
      message="This is a confirmation modal example"
      title="A confirmation modal"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel"
      confirmButtonText="Confirm"
      { ...requiredProps }
    />);
    component.simulate('keydown', { keyCode: 27 });
    sinon.assert.notCalled(onConfirm);
    sinon.assert.calledOnce(onCancel);
  });
});

describe('defaultFocusedButton', () => {
  test('is cancel', () => {
    const component = mount(<KuiConfirmModal
      message="This is a confirmation modal example"
      title="A confirmation modal"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel"
      confirmButtonText="Confirm"
      defaultFocusedButton={ CANCEL_BUTTON }
      { ...requiredProps }
    />);
    const button = component.find('[data-test-subj="confirmModalCancelButton"]').getDOMNode();
    expect(document.activeElement).toEqual(button);
  });

  test('is confirm', () => {
    const component = mount(<KuiConfirmModal
      message="This is a confirmation modal example"
      title="A confirmation modal"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel"
      confirmButtonText="Confirm"
      defaultFocusedButton={ CONFIRM_BUTTON }
      { ...requiredProps }
    />);
    const button = component.find('[data-test-subj="confirmModalConfirmButton"]').getDOMNode();
    expect(document.activeElement).toEqual(button);
  });

  test('when not given focuses on the confirm button', () => {
    const component = mount(<KuiConfirmModal
      message="This is a confirmation modal example"
      title="A confirmation modal"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText="Cancel"
      confirmButtonText="Confirm"
      { ...requiredProps }
    />);
    const button = component.find('[data-test-subj="confirmModalConfirmButton"]').getDOMNode();
    expect(document.activeElement).toEqual(button);
  });
});

