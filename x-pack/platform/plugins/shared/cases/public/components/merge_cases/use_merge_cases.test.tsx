/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { MergeCasesRequest, MergeCasesResponse } from '../../../common/types/api';
import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import { useToasts } from '../../common/lib/kibana';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useCasesToast } from '../../common/use_cases_toast';
import { mergeCases } from '../../containers/api';
import { casesQueriesKeys } from '../../containers/constants';
import { useMergeCases } from './use_merge_cases';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../../common/use_cases_toast', () => ({ useCasesToast: jest.fn() }));
jest.mock('../../containers/api', () => ({ mergeCases: jest.fn() }));

const mergeCasesMock = mergeCases as jest.Mock;
const useCasesToastMock = useCasesToast as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

const request: MergeCasesRequest = {
  caseIds: ['case-1', 'case-2', 'case-3'],
  destinationCaseId: 'case-1',
  fields: { title: 'Phishing' },
  closeSources: true,
};

const counts = { alerts: 2, events: 0, attacks: 0, observables: 1, other: 0 };
const sourceResult = (caseId: string, incrementalId: number) => ({
  caseId,
  title: caseId,
  incrementalId,
  outcome: 'merged' as const,
  closed: true,
  copied: counts,
  existing: counts,
  leftOut: counts,
});

const response: MergeCasesResponse = {
  destination: { id: 'case-1', title: 'Phishing', incrementalId: 118, isNew: false },
  sources: [sourceResult('case-2', 119), sourceResult('case-3', 120)],
  failures: [],
};

describe('useMergeCases', () => {
  const showSuccessToast = jest.fn();
  const showErrorToast = jest.fn();

  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });

  const renderMergeHook = (queryClient: QueryClient) =>
    renderHook(() => useMergeCases(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCasesToastMock.mockReturnValue({ showSuccessToast, showErrorToast });
    useCaseViewNavigationMock.mockReturnValue({
      navigateToCaseView: jest.fn(),
      getCaseViewUrl: jest.fn(({ detailName }) => `/cases/${detailName}`),
    });
  });

  it('reports a clean merge and links to the destination', async () => {
    mergeCasesMock.mockResolvedValue(response);
    const queryClient = createQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderMergeHook(queryClient);

    act(() => result.current.mutate({ request, origin: 'list' }));

    await waitFor(() =>
      expect(showSuccessToast).toHaveBeenCalledWith(
        'Merged 2 cases into #118',
        undefined,
        expect.objectContaining({
          primary: expect.objectContaining({
            children: 'Open case #118',
            href: '/cases/case-1',
            target: '_blank',
          }),
        })
      )
    );
    expect(mergeCasesMock).toHaveBeenCalledWith({ request });
    expect(invalidateQueries).toHaveBeenCalledWith(casesQueriesKeys.all);
  });

  it('does not link to the destination from a case page, which goes there itself', async () => {
    mergeCasesMock.mockResolvedValue(response);
    const { result } = renderMergeHook(createQueryClient());

    act(() => result.current.mutate({ request, origin: 'casePage' }));

    await waitFor(() =>
      expect(showSuccessToast).toHaveBeenCalledWith(
        'Merged 2 cases into #118',
        undefined,
        undefined
      )
    );
  });

  it('names the sources that were not merged', async () => {
    mergeCasesMock.mockResolvedValue({
      ...response,
      sources: [
        { ...sourceResult('case-2', 119), outcome: 'notMerged', closed: false },
        { ...sourceResult('case-3', 120), outcome: 'notMerged', closed: false },
      ],
      failures: [{ step: 'copy', caseId: 'case-2', reason: 'boom' }],
    });
    const { result } = renderMergeHook(createQueryClient());

    act(() => result.current.mutate({ request, origin: 'list' }));

    await waitFor(() =>
      expect(useToasts().addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Merged into #118, but some changes weren't made",
          text: "#119 and #120 weren't merged. Their items stay on them; merge them into #118 again to finish.",
        })
      )
    );
    expect(showSuccessToast).not.toHaveBeenCalled();
  });

  it('warns when a later step failed although every source merged', async () => {
    mergeCasesMock.mockResolvedValue({
      ...response,
      failures: [{ step: 'note', caseId: 'case-1', reason: 'boom' }],
    });
    const { result } = renderMergeHook(createQueryClient());

    act(() => result.current.mutate({ request, origin: 'list' }));

    await waitFor(() =>
      expect(useToasts().addWarning).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Merged into #118, but some changes weren't made" })
      )
    );
  });

  it('leaves a refused merge to the flyout', async () => {
    mergeCasesMock.mockRejectedValue({
      body: {
        attributes: { code: CASES_API_ERROR_CODES.MERGE_BLOCKED, conflicts: [], limits: [] },
      },
    });
    const { result } = renderMergeHook(createQueryClient());

    act(() => result.current.mutate({ request, origin: 'list' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it('reports a failed merge', async () => {
    const error = new Error('boom');
    mergeCasesMock.mockRejectedValue(error);
    const { result } = renderMergeHook(createQueryClient());

    act(() => result.current.mutate({ request, origin: 'list' }));

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ title: "We couldn't merge these cases" })
      )
    );
  });
});
