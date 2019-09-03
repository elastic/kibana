/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { ConfirmDeleteModal } from './confirm_delete_modal';

describe('ConfirmDeleteModal component', () => {
  let props;
  beforeEach(() => {
    props = {
      cancelDeletePipelines: jest.fn(),
      deleteSelectedPipelines: jest.fn(),
      selection: [
        {
          id: 'testId',
        },
      ],
      showConfirmDeleteModal: jest.fn(),
    };
  });

  it('confirms delete for single pipeline', () => {
    const wrapper = shallowWithIntl(<ConfirmDeleteModal {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('confirms delete for multiple pipelines', () => {
    props.selection = [{ id: 'testId' }, { id: 'testId2' }];
    const wrapper = shallowWithIntl(<ConfirmDeleteModal {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('calls cancel delete', () => {
    const wrapper = mountWithIntl(<ConfirmDeleteModal {...props} />);
    wrapper
      .find('[data-test-subj="confirmModalCancelButton"]')
      .first()
      .simulate('click');
    expect(props.cancelDeletePipelines).toHaveBeenCalled();
  });

  it('calls deleteSelectedPipelines', () => {
    const wrapper = mountWithIntl(<ConfirmDeleteModal {...props} />);
    wrapper
      .find('[data-test-subj="confirmModalConfirmButton"]')
      .first()
      .simulate('click');
    expect(props.deleteSelectedPipelines).toHaveBeenCalled();
  });

  it('does not render a component if modal is hidden', () => {
    props.showConfirmDeleteModal = false;
    const wrapper = mountWithIntl(<ConfirmDeleteModal {...props} />);
    expect(wrapper.instance()).toBeNull();
  });
});
