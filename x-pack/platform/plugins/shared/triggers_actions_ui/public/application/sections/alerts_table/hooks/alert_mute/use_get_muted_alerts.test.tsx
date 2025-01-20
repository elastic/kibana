/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as api from '../apis/get_rules_muted_alerts';
import { waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../../../../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer } from '../../../test_utils';
import { useGetMutedAlerts } from './use_get_muted_alerts';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

jest.mock('../apis/get_rules_muted_alerts');
jest.mock('../../../../../common/lib/kibana');

const ruleIds = ['a', 'b'];

describe('useGetMutedAlerts', () => {
  const addErrorMock = useKibana().services.notifications.toasts.addError as jest.Mock;

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer(AlertsQueryContext);
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const muteAlertInstanceSpy = jest.spyOn(api, 'getMutedAlerts');

    renderHook(() => useGetMutedAlerts(ruleIds), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(muteAlertInstanceSpy).toHaveBeenCalledWith(
        expect.anything(),
        { ruleIds },
        expect.any(AbortSignal)
      );
    });
  });

  it('does not call the api if the fetchCases is false', async () => {
    const spy = jest.spyOn(api, 'getMutedAlerts');

    renderHook(() => useGetMutedAlerts(ruleIds, false), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest.spyOn(api, 'getMutedAlerts').mockRejectedValue(new Error('An error'));

    renderHook(() => useGetMutedAlerts(ruleIds), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
