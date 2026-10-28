/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';
import { useConnectors } from './use_connectors';
import { useRegionAvailableEndpoints } from './use_region_available_endpoints';

jest.mock('./use_connectors');

const mockUseConnectors = useConnectors as jest.Mock;

const createConnector = (
  connectorId: string,
  metadata?: InferenceConnector['metadata']
): InferenceConnector => ({
  connectorId,
  name: connectorId,
  type: InferenceConnectorType.Inference,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: true,
  metadata,
});

describe('useRegionAvailableEndpoints', () => {
  beforeEach(() => {
    mockUseConnectors.mockReturnValue({
      data: [
        createConnector('ep-allowed'),
        createConnector('ep-denied', { denied_by_region_policy: true }),
        createConnector('ep-other-denied', { denied_by_region_policy: true }),
      ],
    });
  });

  it('returns the assigned endpoints that the region policy allows', () => {
    const { result } = renderHook(() =>
      useRegionAvailableEndpoints(['ep-denied', 'ep-allowed', 'ep-unknown'])
    );

    expect(result.current.availableEndpointIds).toEqual(['ep-allowed', 'ep-unknown']);
    expect(result.current.regionDeniedEndpointIds).toEqual(
      new Set(['ep-denied', 'ep-other-denied'])
    );
  });

  it('treats every endpoint as available when connectors have not loaded', () => {
    mockUseConnectors.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useRegionAvailableEndpoints(['ep-denied']));

    expect(result.current.availableEndpointIds).toEqual(['ep-denied']);
  });
});
