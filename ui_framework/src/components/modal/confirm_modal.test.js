import React from 'react';
import sinon from 'sinon';
import { mount, render } from 'enzyme';

import { requiredProps } from '../../test/required_props';
import { keyCodes } from '../../services';

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
  const component = render(
    <KuiConfirmModal
      title="A confirmation modal"
      onCancel={() => {}}
      onConfirm={onConfirm}
      cancelButtonText="Cancel Button Text"
      confirmButtonText="Confirm Button Text"
      {...requiredProps}
    >
      This is a confirmation modal example
    </KuiConfirmModal>
  );
  expect(component).toMatchSnapshot();
});

test('onConfirm', () => {
  const component = mount(<KuiConfirmModal
    onCancel={onCancel}
    onConfirm={onConfirm}
  />);
  component.find('[data-test-subj="confirmModalConfirmButton"]').simulate('click');
  sinon.assert.calledOnce(onConfirm);
  sinon.assert.notCalled(onCancel);
});

describe('onCancel', () => {
  test('triggerd by click', () => {
    const component = mount(<KuiConfirmModal
      onCancel={onCancel}
      onConfirm={onConfirm}
    />);
    component.find('[data-test-subj="confirmModalCancelButton"]').simulate('click');
    sinon.assert.notCalled(onConfirm);
    sinon.assert.calledOnce(onCancel);
  });

  test('triggered by esc key', () => {
    const component = mount(<KuiConfirmModal
      onCancel={onCancel}
      onConfirm={onConfirm}
      data-test-subj="modal"
    />);
    component.find('[data-test-subj="modal"]').simulate('keydown', { keyCode: keyCodes.ESCAPE });
    sinon.assert.notCalled(onConfirm);
    sinon.assert.calledOnce(onCancel);
  });
});

describe('defaultFocusedButton', () => {
  test('is cancel', () => {
    const component = mount(<KuiConfirmModal
      onCancel={onCancel}
      defaultFocusedButton={CANCEL_BUTTON}
    />);
    const button = component.find('[data-test-subj="confirmModalCancelButton"]').getDOMNode();
    expect(document.activeElement).toEqual(button);
  });

  test('is confirm', () => {
    const component = mount(<KuiConfirmModal
      onCancel={onCancel}
      defaultFocusedButton={CONFIRM_BUTTON}
    />);
    const button = component.find('[data-test-subj="confirmModalConfirmButton"]').getDOMNode();
    expect(document.activeElement).toEqual(button);
  });

  test('when not given gives focus to the modal', () => {
    const component = mount(<KuiConfirmModal
      onCancel={onCancel}
    />);
    expect(document.activeElement).toEqual(component.getDOMNode().firstChild);
  });
});
