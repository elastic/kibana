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
import { CaseSeverity } from '../../../common/types/domain';
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
  caseIds: ['case-1', 'case-2'],
  destinationCaseId: 'case-1',
  fields: {
    title: 'Phishing',
    description: 'Description',
    severity: CaseSeverity.LOW,
    category: null,
    tags: [],
  },
  closeOriginals: true,
};

const response: MergeCasesResponse = {
  destination: { id: 'case-1', title: 'Phishing', incrementalId: 118, isNew: false },
  mergedCaseIds: ['case-2'],
  closedCaseIds: ['case-2'],
  copied: { alerts: 2, events: 0, observables: 1, other: 0 },
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

    act(() => result.current.mutate(request));

    await waitFor(() =>
      expect(showSuccessToast).toHaveBeenCalledWith(
        'Merged 1 case into #118',
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

  it('warns when some steps failed after the destination was saved', async () => {
    mergeCasesMock.mockResolvedValue({
      ...response,
      failures: [{ step: 'close', caseId: 'case-2', message: 'conflict' }],
    });
    const { result } = renderMergeHook(createQueryClient());

    act(() => result.current.mutate(request));

    await waitFor(() =>
      expect(useToasts().addWarning).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Merged into #118, but some changes weren't made" })
      )
    );
    expect(showSuccessToast).not.toHaveBeenCalled();
  });

  it('reports a failed merge', async () => {
    const error = new Error('boom');
    mergeCasesMock.mockRejectedValue(error);
    const { result } = renderMergeHook(createQueryClient());

    act(() => result.current.mutate(request));

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ title: "We couldn't merge these cases" })
      )
    );
  });
});
