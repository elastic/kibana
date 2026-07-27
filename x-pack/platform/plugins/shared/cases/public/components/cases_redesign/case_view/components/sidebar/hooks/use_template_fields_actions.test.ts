/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';

import { useTemplateFieldsActions } from './use_template_fields_actions';
import { basicCase } from '../../../../../../containers/mock';
import { TestProviders } from '../../../../../../common/mock';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import { useReplaceCustomField } from '../../../../../../containers/use_replace_custom_field';
import type { CaseUI } from '../../../../../../../common';

jest.mock('../../../../../../common/navigation/hooks');
jest.mock('../../../../../case_view/use_on_update_field');
jest.mock('../../../../../../containers/use_replace_custom_field');

const onUpdateField = jest.fn();
const replaceCustomField = jest.fn();

const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;
const useReplaceCustomFieldMock = useReplaceCustomField as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

const caseData: CaseUI = basicCase;

describe('useTemplateFieldsActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnUpdateFieldMock.mockReturnValue({ onUpdateField, isLoading: false, loadingKey: null });
    useReplaceCustomFieldMock.mockReturnValue({
      isLoading: false,
      mutate: replaceCustomField,
    });
  });

  it('exposes onUpdateField for template fields', () => {
    const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

    expect(result.current.onUpdateField).toBe(onUpdateField);
  });

  it('calls replaceCustomField with the case id and version when submitting a custom field', () => {
    const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

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

  it('is loading when either the field update or the custom field replacement is in flight', () => {
    useOnUpdateFieldMock.mockReturnValue({
      onUpdateField,
      isLoading: true,
      loadingKey: 'customFields',
    });

    const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

    expect(result.current.isCustomFieldsLoading).toBe(true);
  });

  it('is loading when the custom field mutation itself is in flight', () => {
    useReplaceCustomFieldMock.mockReturnValue({ isLoading: true, mutate: replaceCustomField });

    const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

    expect(result.current.isCustomFieldsLoading).toBe(true);
  });

  it('is not loading for other loading keys', () => {
    useOnUpdateFieldMock.mockReturnValue({
      onUpdateField,
      isLoading: true,
      loadingKey: 'severity',
    });

    const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

    expect(result.current.isCustomFieldsLoading).toBe(false);
  });

  it('memoizes the returned object when nothing changes between renders', () => {
    const { result, rerender } = renderHook(() => useTemplateFieldsActions({ caseData }), {
      wrapper,
    });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });
});
