/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';

import { useCaseViewSidebar } from './use_case_view_sidebar';
import { basicCase, getCaseUsersMockResponse } from '../../../../../../containers/mock';
import { TestProviders } from '../../../../../../common/mock';
import { useGetCaseConfiguration } from '../../../../../../containers/configure/use_get_case_configuration';
import { useGetCaseUsers } from '../../../../../../containers/use_get_case_users';
import { useGetCaseConnectors } from '../../../../../../containers/use_get_case_connectors';
import { useGetCurrentUserProfile } from '../../../../../../containers/user_profiles/use_get_current_user_profile';
import { useGetSupportedActionConnectors } from '../../../../../../containers/configure/use_get_supported_action_connectors';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import { useReplaceCustomField } from '../../../../../../containers/use_replace_custom_field';
import type { CaseUI } from '../../../../../../../common';

jest.mock('../../../../../../common/navigation/hooks');
jest.mock('../../../../../../containers/configure/use_get_case_configuration');
jest.mock('../../../../../../containers/use_get_case_users');
jest.mock('../../../../../../containers/use_get_case_connectors');
jest.mock('../../../../../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../../../../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../../../../case_view/use_on_update_field');
jest.mock('../../../../../../containers/use_replace_custom_field');
jest.mock('../../../../../templates_v2/hooks/use_get_template', () => ({
  useGetTemplate: jest.fn().mockReturnValue({ data: undefined }),
}));

const onUpdateField = jest.fn();
const replaceCustomField = jest.fn();

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const useGetSupportedActionConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;
const useReplaceCustomFieldMock = useReplaceCustomField as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

const caseData: CaseUI = basicCase;

describe('useCaseViewSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseConfigurationMock.mockReturnValue({ data: { customFields: [] } });
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: getCaseUsersMockResponse() });
    useGetCaseConnectorsMock.mockReturnValue({ data: {} });
    useGetCurrentUserProfileMock.mockReturnValue({ data: {}, isFetching: false });
    useGetSupportedActionConnectorsMock.mockReturnValue({ isLoading: false, data: [] });
    useOnUpdateFieldMock.mockReturnValue({ onUpdateField, isLoading: false, loadingKey: null });
    useReplaceCustomFieldMock.mockReturnValue({
      isLoading: false,
      mutate: replaceCustomField,
    });
  });

  it('exposes the permissions from the cases context', () => {
    const { result } = renderHook(() => useCaseViewSidebar({ caseData }), { wrapper });

    expect(result.current.permissions.update).toBe(true);
  });

  it('falls back to the default template fields title when no template is applied', () => {
    const { result } = renderHook(() => useCaseViewSidebar({ caseData }), { wrapper });

    expect(result.current.templateFieldsTitle).toBeTruthy();
  });

  it('only calls onUpdateField for assignees when the assignee set actually changes', () => {
    const { result } = renderHook(() => useCaseViewSidebar({ caseData }), { wrapper });

    act(() => {
      result.current.onUpdateAssignees(
        caseData.assignees.map((assignee) => ({ uid: assignee.uid }))
      );
    });

    expect(onUpdateField).not.toHaveBeenCalled();

    act(() => {
      result.current.onUpdateAssignees([{ uid: 'a-new-assignee' }]);
    });

    expect(onUpdateField).toHaveBeenCalledWith({
      key: 'assignees',
      value: [{ uid: 'a-new-assignee' }],
    });
  });

  it('calls replaceCustomField with the case id and version when submitting a custom field', () => {
    const { result } = renderHook(() => useCaseViewSidebar({ caseData }), { wrapper });

    act(() => {
      result.current.onSubmitCustomField({ key: 'my-field', type: 'text', value: 'foo' } as never);
    });

    expect(replaceCustomField).toHaveBeenCalledWith({
      caseId: caseData.id,
      customFieldId: 'my-field',
      customFieldValue: 'foo',
      caseVersion: caseData.version,
      caseData,
    });
  });

  it('only reports the field that is currently updating as loading', () => {
    useOnUpdateFieldMock.mockReturnValue({
      onUpdateField,
      isLoading: true,
      loadingKey: 'severity',
    });

    const { result } = renderHook(() => useCaseViewSidebar({ caseData }), { wrapper });

    expect(result.current.isSeverityLoading).toBe(true);
    expect(result.current.isTagsLoading).toBe(false);
    expect(result.current.isCategoryLoading).toBe(false);
  });
});
