/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useConnectors } from './use_connectors';
import { useSupportedEffortLevels } from './use_supported_effort_levels';

jest.mock('./use_connectors');

const mockUseConnectors = useConnectors as jest.Mock;

describe('useSupportedEffortLevels', () => {
  it('keeps the same map across renders while connectors are loading', () => {
    mockUseConnectors.mockReturnValue({ data: undefined });
    const { result, rerender } = renderHook(() => useSupportedEffortLevels());
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('maps EIS connectors to the known effort levels they support', () => {
    mockUseConnectors.mockReturnValue({
      data: [
        {
          connectorId: 'eis-1',
          isEis: true,
          metadata: {
            capabilities: { reasoning: { supported_effort_levels: ['high', 'unknown', 'low'] } },
          },
        },
        { connectorId: 'eis-2', isEis: true, metadata: {} },
        { connectorId: 'other', isEis: false },
      ],
    });
    const { result } = renderHook(() => useSupportedEffortLevels());

    expect([...result.current]).toEqual([['eis-1', ['high', 'low']]]);
  });
});
