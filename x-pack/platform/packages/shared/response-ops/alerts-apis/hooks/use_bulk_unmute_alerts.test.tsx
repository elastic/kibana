/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { Wrapper } from '@kbn/alerts-ui-shared/src/common/test_utils/wrapper';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import * as api from '../apis/bulk_unmute_alerts';
import { useBulkUnmuteAlerts } from './use_bulk_unmute_alerts';

jest.mock('../apis/bulk_unmute_alerts');

const params = {
  rules: [
    { rule_id: 'rule-1', alert_instance_ids: ['alert-1', 'alert-2'] },
    { rule_id: 'rule-2', alert_instance_ids: ['alert-3'] },
  ],
};

describe('useBulkUnmuteAlerts', () => {
  const http = httpServiceMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const addErrorMock = notifications.toasts.addError;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const bulkUnmuteAlertsSpy = jest.spyOn(api, 'bulkUnmuteAlerts');

    const { result } = renderHook(() => useBulkUnmuteAlerts({ http, notifications }), {
      wrapper: Wrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(bulkUnmuteAlertsSpy).toHaveBeenCalledWith({
        rules: params.rules,
        http: expect.anything(),
      });
    });
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest.spyOn(api, 'bulkUnmuteAlerts').mockRejectedValue(new Error('An error'));

    const { result } = renderHook(() => useBulkUnmuteAlerts({ http, notifications }), {
      wrapper: Wrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
