/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useDeleteCases } from '../../../../containers/case/use_delete_cases';
import { TestProviders } from '../../../../mock';
import { basicCase } from '../../../../containers/case/mock';
import { CaseViewActions } from './actions';
jest.mock('../../../../containers/case/use_delete_cases');
const useDeleteCasesMock = useDeleteCases as jest.Mock;

describe('CaseView actions', () => {
  const handleOnDeleteConfirm = jest.fn();
  const handleToggleModal = jest.fn();
  const dispatchResetIsDeleted = jest.fn();
  const defaultDeleteState = {
    dispatchResetIsDeleted,
    handleToggleModal,
    handleOnDeleteConfirm,
    isLoading: false,
    isError: false,
    isDeleted: false,
    isDisplayConfirmDeleteModal: false,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    useDeleteCasesMock.mockImplementation(() => defaultDeleteState);
  });
  it('clicking trash toggles modal', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseViewActions caseData={basicCase} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();

    wrapper
      .find('button[data-test-subj="property-actions-ellipses"]')
      .first()
      .simulate('click');
    wrapper.find('button[data-test-subj="property-actions-trash"]').simulate('click');
    expect(handleToggleModal).toHaveBeenCalled();
  });
  it('toggle delete modal and confirm', () => {
    useDeleteCasesMock.mockImplementation(() => ({
      ...defaultDeleteState,
      isDisplayConfirmDeleteModal: true,
    }));
    const wrapper = mount(
      <TestProviders>
        <CaseViewActions caseData={basicCase} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
    wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');
    expect(handleOnDeleteConfirm.mock.calls[0][0]).toEqual([
      { id: basicCase.id, title: basicCase.title },
    ]);
  });
});
