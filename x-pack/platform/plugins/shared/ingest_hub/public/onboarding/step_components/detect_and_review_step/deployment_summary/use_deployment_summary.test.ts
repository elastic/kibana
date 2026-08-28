/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useDeploymentSummary } from './use_deployment_summary';

const mockUseSessionStorage = useSessionStorage as jest.Mock;

describe('useDeploymentSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSessionStorage.mockReturnValue([
      { globalRegion: 'us-east-1', serviceVars: {} },
      jest.fn(),
    ]);
  });

  describe('managed_integration', () => {
    it('returns deployment method and region when globalRegion is set', () => {
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      const labels = result.current.map((f) => f.defaultMessage);
      expect(labels).toContain('Deployment method');
      expect(labels).toContain('Region');
    });

    it('omits CloudFormation stack when not available', () => {
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(
        result.current.find((f) => f.defaultMessage === 'CloudFormation stack')
      ).toBeUndefined();
    });

    it('omits Region when globalRegion is empty', () => {
      mockUseSessionStorage.mockReturnValue([{ globalRegion: '', serviceVars: {} }, jest.fn()]);
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(result.current.find((f) => f.defaultMessage === 'Region')).toBeUndefined();
    });

    it('does not include Federated Identity Name', () => {
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(
        result.current.find((f) => f.defaultMessage.toLowerCase().includes('federated'))
      ).toBeUndefined();
    });
  });

  describe('agent_based', () => {
    it('returns only fields with non-null values', () => {
      const { result } = renderHook(() => useDeploymentSummary('agent_based'));
      // Only "Deployment method" has a non-null value; the rest are blocked on #9079
      expect(result.current).toHaveLength(1);
      expect(result.current[0].defaultMessage).toBe('Deployment method');
    });
  });
});
