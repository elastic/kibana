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
import { getCase } from '../../../../../../containers/api';
import { useReplaceCustomField } from '../../../../../../containers/use_replace_custom_field';
import type { CaseUI } from '../../../../../../../common';

jest.mock('../../../../../../common/navigation/hooks');
jest.mock('../../../../../case_view/use_on_update_field');
jest.mock('../../../../../../containers/use_replace_custom_field');
jest.mock('../../../../../../containers/api', () => ({ getCase: jest.fn() }));

const onUpdateField = jest.fn();
const replaceCustomField = jest.fn();
const replaceCustomFieldAsync = jest.fn();

const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;
const useReplaceCustomFieldMock = useReplaceCustomField as jest.Mock;
const getCaseMock = getCase as jest.Mock;

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
      mutateAsync: replaceCustomFieldAsync,
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

  describe('onSaveCustomFields', () => {
    it('saves a single changed field without refetching the case', async () => {
      replaceCustomFieldAsync.mockResolvedValue({ key: 'field-1', value: 'foo' });
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

      await act(async () => {
        await result.current.onSaveCustomFields(
          { 'field-1': { key: 'field-1', type: 'text', value: 'foo' } },
          { onSuccess, onError }
        );
      });

      expect(replaceCustomFieldAsync).toHaveBeenCalledTimes(1);
      expect(replaceCustomFieldAsync).toHaveBeenCalledWith({
        caseId: caseData.id,
        customFieldId: 'field-1',
        customFieldValue: 'foo',
        caseVersion: caseData.version,
        caseData,
      });
      expect(getCaseMock).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('chains multiple changed fields, refetching the case version between writes', async () => {
      const refetchedCase = { ...caseData, version: 'refetched-version' };
      replaceCustomFieldAsync.mockResolvedValue({});
      getCaseMock.mockResolvedValue(refetchedCase);
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

      await act(async () => {
        await result.current.onSaveCustomFields(
          {
            'field-1': { key: 'field-1', type: 'text', value: 'foo' },
            'field-2': { key: 'field-2', type: 'text', value: 'bar' },
          },
          { onSuccess, onError }
        );
      });

      // The second write must carry the version the first write's refetch produced, not the
      // version the whole batch started from, or the server rejects it as a stale write.
      expect(replaceCustomFieldAsync).toHaveBeenNthCalledWith(1, {
        caseId: caseData.id,
        customFieldId: 'field-1',
        customFieldValue: 'foo',
        caseVersion: caseData.version,
        caseData,
      });
      expect(getCaseMock).toHaveBeenCalledWith({ caseId: caseData.id });
      expect(replaceCustomFieldAsync).toHaveBeenNthCalledWith(2, {
        caseId: refetchedCase.id,
        customFieldId: 'field-2',
        customFieldValue: 'bar',
        caseVersion: refetchedCase.version,
        caseData: refetchedCase,
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('calls onError and stops the batch when a write fails', async () => {
      replaceCustomFieldAsync.mockRejectedValueOnce(new Error('conflict'));
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useTemplateFieldsActions({ caseData }), { wrapper });

      await act(async () => {
        await result.current.onSaveCustomFields(
          {
            'field-1': { key: 'field-1', type: 'text', value: 'foo' },
            'field-2': { key: 'field-2', type: 'text', value: 'bar' },
          },
          { onSuccess, onError }
        );
      });

      expect(replaceCustomFieldAsync).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
