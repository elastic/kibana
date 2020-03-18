/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { CaseComponent } from './';
import * as updateHook from '../../../../containers/case/use_update_case';
import * as deleteHook from '../../../../containers/case/use_delete_cases';
import { caseProps, data } from './__mock__';
import { TestProviders } from '../../../../mock';

describe('CaseView ', () => {
  const handleOnDeleteConfirm = jest.fn();
  const handleToggleModal = jest.fn();
  const dispatchResetIsDeleted = jest.fn();
  const updateCaseProperty = jest.fn();
  /* eslint-disable no-console */
  // Silence until enzyme fixed to use ReactTestUtils.act()
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  /* eslint-enable no-console */

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(updateHook, 'useUpdateCase').mockReturnValue({
      caseData: data,
      isLoading: false,
      isError: false,
      updateKey: null,
      updateCaseProperty,
    });
  });

  it('should render CaseComponent', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseComponent {...caseProps} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-test-subj="case-view-title"]`)
        .first()
        .prop('title')
    ).toEqual(data.title);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-status"]`)
        .first()
        .text()
    ).toEqual(data.status);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-tag-list"] .euiBadge__text`)
        .first()
        .text()
    ).toEqual(data.tags[0]);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-username"]`)
        .first()
        .text()
    ).toEqual(data.createdBy.username);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-createdAt"]`)
        .first()
        .prop('value')
    ).toEqual(data.createdAt);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-description"]`)
        .first()
        .prop('raw')
    ).toEqual(data.description);
  });

  it('should dispatch update state when button is toggled', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseComponent {...caseProps} />
      </TestProviders>
    );

    wrapper
      .find('input[data-test-subj="toggle-case-status"]')
      .simulate('change', { target: { value: false } });

    expect(updateCaseProperty).toBeCalledWith({
      updateKey: 'status',
      updateValue: 'closed',
    });
  });

  it('should render comments', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseComponent {...caseProps} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(
          `div[data-test-subj="user-action-${data.comments[0].id}-avatar"] [data-test-subj="user-action-avatar"]`
        )
        .first()
        .prop('name')
    ).toEqual(data.comments[0].createdBy.fullName);

    expect(
      wrapper
        .find(
          `div[data-test-subj="user-action-${data.comments[0].id}"] [data-test-subj="user-action-title"] strong`
        )
        .first()
        .text()
    ).toEqual(data.comments[0].createdBy.username);

    expect(
      wrapper
        .find(
          `div[data-test-subj="user-action-${data.comments[0].id}"] [data-test-subj="markdown"]`
        )
        .first()
        .prop('source')
    ).toEqual(data.comments[0].comment);
  });

  it('toggle delete modal and cancel', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseComponent {...caseProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();

    wrapper
      .find(
        '[data-test-subj="case-view-actions"] button[data-test-subj="property-actions-ellipses"]'
      )
      .first()
      .simulate('click');
    wrapper.find('button[data-test-subj="property-actions-trash"]').simulate('click');
    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
    wrapper.find('button[data-test-subj="confirmModalCancelButton"]').simulate('click');
    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();
  });

  it('toggle delete modal and confirm', () => {
    jest.spyOn(deleteHook, 'useDeleteCases').mockReturnValue({
      dispatchResetIsDeleted,
      handleToggleModal,
      handleOnDeleteConfirm,
      isLoading: false,
      isError: false,
      isDeleted: false,
      isDisplayConfirmDeleteModal: true,
    });
    const wrapper = mount(
      <TestProviders>
        <CaseComponent {...caseProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
    wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');
    expect(handleOnDeleteConfirm.mock.calls[0][0]).toEqual([caseProps.caseId]);
  });
});
