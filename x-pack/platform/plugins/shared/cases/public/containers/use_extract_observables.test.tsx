/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { MAX_OBSERVABLES_PER_CASE } from '../../common/constants';
import type { ExtractObservablesResponseUI } from '../../common/ui/types';
import { useExtractObservables } from './use_extract_observables';
import { extractObservables } from './api';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { TestProviders } from '../common/mock';
import { basicCase } from './mock';
import * as i18n from './translations';

jest.mock('./api');
jest.mock('../common/use_cases_toast');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

const buildResult = (
  overrides: Partial<ExtractObservablesResponseUI>
): ExtractObservablesResponseUI => ({
  case: basicCase,
  status: 'extracted',
  newObservablesCount: 2,
  alertsRequested: 2,
  alertsFound: 2,
  ...overrides,
});

describe('useExtractObservables', () => {
  const caseId = 'test-case-id';
  const showErrorToast = jest.fn();
  const showSuccessToast = jest.fn();
  const showInfoToast = jest.fn();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const run = async (onSuccess?: jest.Mock) => {
    const { result } = renderHook(() => useExtractObservables(caseId, { onSuccess }), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(extractObservables).toHaveBeenCalledWith(caseId));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesToast as jest.Mock).mockReturnValue({
      showErrorToast,
      showSuccessToast,
      showInfoToast,
    });
  });

  it('shows the count of new observables and refreshes the case when observables were extracted', async () => {
    (extractObservables as jest.Mock).mockResolvedValue(buildResult({}));

    await run();

    await waitFor(() =>
      expect(showSuccessToast).toHaveBeenCalledWith(i18n.OBSERVABLES_EXTRACTED(2))
    );
    expect(refreshCaseViewPage).toHaveBeenCalled();
    expect(showInfoToast).not.toHaveBeenCalled();
  });

  it('shows an info toast and does not refresh the case when there are no new observables', async () => {
    (extractObservables as jest.Mock).mockResolvedValue(
      buildResult({ status: 'no_new_observables', newObservablesCount: 0 })
    );

    await run();

    await waitFor(() => expect(showInfoToast).toHaveBeenCalledWith(i18n.NO_NEW_OBSERVABLES_FOUND));
    expect(showSuccessToast).not.toHaveBeenCalled();
    expect(refreshCaseViewPage).not.toHaveBeenCalled();
  });

  it('shows the limit message when the case reached the observables limit', async () => {
    (extractObservables as jest.Mock).mockResolvedValue(
      buildResult({ status: 'cap_reached', newObservablesCount: 0 })
    );

    await run();

    await waitFor(() =>
      expect(showInfoToast).toHaveBeenCalledWith(
        i18n.OBSERVABLES_LIMIT_REACHED(MAX_OBSERVABLES_PER_CASE)
      )
    );
    expect(refreshCaseViewPage).not.toHaveBeenCalled();
  });

  it('shows the not found message when no attached alert or event could be read', async () => {
    (extractObservables as jest.Mock).mockResolvedValue(
      buildResult({ status: 'alerts_not_found', newObservablesCount: 0, alertsFound: 0 })
    );

    await run();

    await waitFor(() =>
      expect(showInfoToast).toHaveBeenCalledWith(i18n.NO_ALERTS_FOUND_TO_EXTRACT)
    );
    expect(refreshCaseViewPage).not.toHaveBeenCalled();
  });

  it('calls onSuccess with the result', async () => {
    const result = buildResult({});
    (extractObservables as jest.Mock).mockResolvedValue(result);
    const onSuccess = jest.fn();

    await run(onSuccess);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(result));
  });

  it('shows an error toast and does not call onSuccess on failure', async () => {
    const error = new Error('Failed to extract observables');
    (extractObservables as jest.Mock).mockRejectedValue(error);
    const onSuccess = jest.fn();

    await run(onSuccess);

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(error, { title: expect.any(String) })
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(refreshCaseViewPage).not.toHaveBeenCalled();
  });
});
