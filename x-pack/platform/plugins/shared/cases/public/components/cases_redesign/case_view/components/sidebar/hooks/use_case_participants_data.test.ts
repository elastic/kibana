/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { useCaseParticipantsData } from './use_case_participants_data';
import { basicCase, getCaseUsersMockResponse } from '../../../../../../containers/mock';
import { TestProviders } from '../../../../../../common/mock';
import { useGetCaseUsers } from '../../../../../../containers/use_get_case_users';
import type { CaseUI } from '../../../../../../../common';

jest.mock('../../../../../../common/navigation/hooks');
jest.mock('../../../../../../containers/use_get_case_users');

const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

const caseData: CaseUI = basicCase;

describe('useCaseParticipantsData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: getCaseUsersMockResponse() });
  });

  it('derives participants from case users and the case creator', () => {
    const { result } = renderHook(() => useCaseParticipantsData({ caseData }), { wrapper });

    expect(result.current.participants).toEqual([
      ...getCaseUsersMockResponse().participants,
      ...getCaseUsersMockResponse().assignees,
    ]);
    expect(result.current.userProfiles).toBeInstanceOf(Map);
  });

  it('leaves participants undefined while case users are still loading', () => {
    useGetCaseUsersMock.mockReturnValue({ isLoading: true, data: undefined });

    const { result } = renderHook(() => useCaseParticipantsData({ caseData }), { wrapper });

    expect(result.current.participants).toBeUndefined();
    expect(result.current.isLoadingCaseUsers).toBe(true);
  });

  it('memoizes the returned object when nothing changes between renders', () => {
    const { result, rerender } = renderHook(() => useCaseParticipantsData({ caseData }), {
      wrapper,
    });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });
});
