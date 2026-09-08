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

const AUTH_STEP_KEY = 'onboarding.aws.authenticateAndDeployStep';

function mockStorageValues({
  globalRegion = 'us-east-1',
  connectorName,
}: {
  globalRegion?: string;
  connectorName?: string;
} = {}) {
  mockUseSessionStorage.mockImplementation((key: string) => {
    if (key === AUTH_STEP_KEY) {
      return [{ connectorName }, jest.fn()];
    }
    // SERVICE_SETTINGS_KEY and any other key
    return [{ globalRegion, serviceVars: {} }, jest.fn()];
  });
}

describe('useDeploymentSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageValues();
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
      mockStorageValues({ globalRegion: '' });
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(result.current.find((f) => f.defaultMessage === 'Region')).toBeUndefined();
    });

    it('includes Federated Identity Name when connectorName is set', () => {
      mockStorageValues({ connectorName: 'my-prod-connector' });
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      const field = result.current.find((f) => f.defaultMessage === 'Federated Identity Name');
      expect(field).toBeDefined();
      expect(field?.value).toBe('my-prod-connector');
    });

    it('omits Federated Identity Name when connectorName is absent', () => {
      mockStorageValues({ connectorName: undefined });
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(
        result.current.find((f) => f.defaultMessage === 'Federated Identity Name')
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
