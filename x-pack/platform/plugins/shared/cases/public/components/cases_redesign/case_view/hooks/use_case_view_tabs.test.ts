/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { useCaseViewTabs } from './use_case_view_tabs';
import { basicCase } from '../../../../containers/mock';
import { TestProviders } from '../../../../common/mock';
import { CASE_VIEW_PAGE_TABS } from '../../../../../common/types';
import { useUrlParams } from '../../../../common/navigation';

jest.mock('../../../../common/navigation/hooks');

const useUrlParamsMock = useUrlParams as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

describe('useCaseViewTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUrlParamsMock.mockReturnValue({ urlParams: {} });
  });

  it('defaults to ACTIVITY tab when no tabId in URL', () => {
    const { result } = renderHook(() => useCaseViewTabs({ caseData: basicCase }), { wrapper });

    expect(result.current.activeTabId).toBe(CASE_VIEW_PAGE_TABS.ACTIVITY);
    expect(result.current.isAttachmentTab).toBe(false);
  });

  it('returns ALERTS tab when url params contain tabId=alerts', () => {
    useUrlParamsMock.mockReturnValue({ urlParams: { tabId: CASE_VIEW_PAGE_TABS.ALERTS } });

    const { result } = renderHook(() => useCaseViewTabs({ caseData: basicCase }), { wrapper });

    expect(result.current.activeTabId).toBe(CASE_VIEW_PAGE_TABS.ALERTS);
    expect(result.current.isAttachmentTab).toBe(true);
  });

  it('returns EVENTS tab when url params contain tabId=events', () => {
    useUrlParamsMock.mockReturnValue({ urlParams: { tabId: CASE_VIEW_PAGE_TABS.EVENTS } });

    const { result } = renderHook(() => useCaseViewTabs({ caseData: basicCase }), { wrapper });

    expect(result.current.activeTabId).toBe(CASE_VIEW_PAGE_TABS.EVENTS);
    expect(result.current.isAttachmentTab).toBe(true);
  });

  it('returns FILES tab when url params contain tabId=files', () => {
    useUrlParamsMock.mockReturnValue({ urlParams: { tabId: CASE_VIEW_PAGE_TABS.FILES } });

    const { result } = renderHook(() => useCaseViewTabs({ caseData: basicCase }), { wrapper });

    expect(result.current.activeTabId).toBe(CASE_VIEW_PAGE_TABS.FILES);
    expect(result.current.isAttachmentTab).toBe(true);
  });

  it('returns SIMILAR_CASES tab when url params contain tabId=similar_cases', () => {
    useUrlParamsMock.mockReturnValue({
      urlParams: { tabId: CASE_VIEW_PAGE_TABS.SIMILAR_CASES },
    });

    const { result } = renderHook(() => useCaseViewTabs({ caseData: basicCase }), { wrapper });

    expect(result.current.activeTabId).toBe(CASE_VIEW_PAGE_TABS.SIMILAR_CASES);
    expect(result.current.isAttachmentTab).toBe(false);
  });

  it('falls back to ACTIVITY tab for invalid tabId', () => {
    useUrlParamsMock.mockReturnValue({ urlParams: { tabId: 'nonexistent' } });

    const { result } = renderHook(() => useCaseViewTabs({ caseData: basicCase }), { wrapper });

    expect(result.current.activeTabId).toBe(CASE_VIEW_PAGE_TABS.ACTIVITY);
  });

  it('returns undefined tab components when no attachment types are registered', () => {
    const { result } = renderHook(() => useCaseViewTabs({ caseData: basicCase }), { wrapper });

    expect(result.current.EventTabComponent).toBeUndefined();
    expect(result.current.AlertTabComponent).toBeUndefined();
    expect(result.current.FileTabComponent).toBeUndefined();
  });
});
