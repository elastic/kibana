/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_RULES_CONFIG_API_PATH } from '@kbn/alerting-v2-constants';
import { createQueryClientWrapper } from '../../test_utils';
import { useAlertingConfig } from './use_alerting_config';

describe('useAlertingConfig', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
  });

  it('fetches the rules config from the internal API', async () => {
    http.get.mockResolvedValue({ minimumScheduleInterval: '5m' });

    const { result } = renderHook(() => useAlertingConfig({ http }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ minimumScheduleInterval: '5m' });
    });

    expect(http.get).toHaveBeenCalledWith(ALERTING_V2_RULES_CONFIG_API_PATH);
  });

  it('has no data while loading', () => {
    http.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAlertingConfig({ http }), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });
});
