import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';

import { requiredProps } from '../../test/required_props';

import {
  KuiConfirmModal,
} from './confirm_modal';

const onConfirm = sinon.spy();
const onCancel = sinon.spy();

test('renders KuiConfirmModal', () => {
  const component = mount(<KuiConfirmModal
    message="This is a confirmation modal example"
    title="A confirmation modal"
    onCancel={() => {}}
    onConfirm={onConfirm}
    cancelButtonText="Cancel Button Text"
    confirmButtonText="Confirm Button Text"
    { ...requiredProps }
  />);
  expect(component).toMatchSnapshot();

  component.find('[data-test-subj="confirmModalConfirmButton"]').simulate('click');
  sinon.assert.calledOnce(onConfirm);
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
  onConfirm.reset();
  onCancel.reset();
  component.find('[data-test-subj="confirmModalConfirmButton"]').simulate('click');
  sinon.assert.calledOnce(onConfirm);
  sinon.assert.notCalled(onCancel);
});

test('onCancel', () => {
  const component = mount(<KuiConfirmModal
    message="This is a confirmation modal example"
    title="A confirmation modal"
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText="Cancel"
    confirmButtonText="Confirm"
    { ...requiredProps }
  />);
  onConfirm.reset();
  onCancel.reset();
  component.find('[data-test-subj="confirmModalCancelButton"]').simulate('click');
  sinon.assert.notCalled(onConfirm);
  sinon.assert.calledOnce(onCancel);
});
