/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { createUseEchAutoOpsStatusHook } from './use_ech_autoops_status';

describe('createUseEchAutoOpsStatusHook', () => {
  it('reports AutoOps as enabled with the ECH deployment URL', () => {
    const deploymentUrl = 'https://cloud.elastic.co/deployments/deployment-id';
    const useEchAutoOpsStatus = createUseEchAutoOpsStatusHook(deploymentUrl);

    const { result } = renderHook(() => useEchAutoOpsStatus());

    expect(result.current).toEqual({
      isCloudConnected: true,
      isCloudConnectEisEnabled: false,
      isCloudConnectAutoopsEnabled: true,
      autoOpsServiceUrl: deploymentUrl,
      isLoading: false,
      error: null,
    });
  });

  it('reports AutoOps as enabled without exposing a broken URL when deploymentUrl is absent', () => {
    const useEchAutoOpsStatus = createUseEchAutoOpsStatusHook();

    const { result } = renderHook(() => useEchAutoOpsStatus());

    expect(result.current.isCloudConnectAutoopsEnabled).toBe(true);
    expect(result.current.autoOpsServiceUrl).toBeUndefined();
  });
});
