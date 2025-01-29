/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as api from './apis/bulk_get_cases';
import { waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import { useBulkGetCases } from './use_bulk_get_cases';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

jest.mock('./apis/bulk_get_cases');
jest.mock('../../../../common/lib/kibana');

const response = {
  cases: [],
  errors: [],
};

describe('useBulkGetCases', () => {
  const addErrorMock = useKibana().services.notifications.toasts.addError as jest.Mock;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer(AlertsQueryContext);
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases');
    spy.mockResolvedValue(response);

    renderHook(() => useBulkGetCases(['case-1'], true), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        {
          ids: ['case-1'],
        },
        expect.any(AbortSignal)
      )
    );
  });

  it('does not call the api if the fetchCases is false', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases');
    spy.mockResolvedValue(response);

    renderHook(() => useBulkGetCases(['case-1'], false), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api return an error', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases').mockRejectedValue(new Error('An error'));

    renderHook(() => useBulkGetCases(['case-1'], true), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        {
          ids: ['case-1'],
        },
        expect.any(AbortSignal)
      );
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
