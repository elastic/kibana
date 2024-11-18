/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import * as api from '../apis/get_rules_with_muted_alerts';
import { useKibana } from '../../../../../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer } from '../../../test_utils';
import { useGetMutedAlertsQuery } from './use_get_muted_alerts';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

jest.mock('../apis/get_rules_with_muted_alerts');
jest.mock('../../../../../common/lib/kibana');

const ruleIds = ['a', 'b'];

describe('useGetMutedAlerts', () => {
  const addErrorMock = jest.mocked(useKibana().services.notifications.toasts.addError);

  const appMockRender: AppMockRenderer = createAppMockRenderer({
    queryClientContext: AlertsQueryContext,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const muteAlertInstanceSpy = jest.spyOn(api, 'getRulesWithMutedAlerts');

    renderHook(() => useGetMutedAlertsQuery({ ruleIds }), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() =>
      expect(muteAlertInstanceSpy).toHaveBeenCalledWith(expect.objectContaining({ ruleIds }))
    );
  });

  it('does not call the api if the enabled option is false', async () => {
    const spy = jest.spyOn(api, 'getRulesWithMutedAlerts');

    renderHook(() => useGetMutedAlertsQuery({ ruleIds }, { enabled: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest.spyOn(api, 'getRulesWithMutedAlerts').mockRejectedValue(new Error('An error'));

    renderHook(() => useGetMutedAlertsQuery({ ruleIds }), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(addErrorMock).toHaveBeenCalled();
  });
});
