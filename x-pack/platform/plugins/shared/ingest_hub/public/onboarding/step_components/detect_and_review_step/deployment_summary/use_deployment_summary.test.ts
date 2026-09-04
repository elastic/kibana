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
import type { PersistedEcfLaunchStep } from '../../ecf_deployment_section';

const mockUseSessionStorage = useSessionStorage as jest.Mock;

const SERVICE_SETTINGS_WITH_REGION = { globalRegion: 'us-east-1', serviceVars: {} };
const SERVICE_SETTINGS_EMPTY = { globalRegion: '', serviceVars: {} };
const ECF_LAUNCH_STEP_EMPTY: PersistedEcfLaunchStep = { launchedFamilies: [] };
const ECF_LAUNCH_STEP_UNIFIED: PersistedEcfLaunchStep = {
  launchedFamilies: ['unified'],
  stackNames: { unified: 'my-custom-stack' },
  stackVersions: { unified: '1.10.0' },
};
const ECF_LAUNCH_STEP_UNIFIED_DEFAULT: PersistedEcfLaunchStep = {
  launchedFamilies: ['unified'],
};

/** Set up two sequential `useSessionStorage` return values: service settings first, ECF step second. */
const mockStorageCalls = (
  serviceSettings: typeof SERVICE_SETTINGS_WITH_REGION | typeof SERVICE_SETTINGS_EMPTY,
  ecfLaunchStep: PersistedEcfLaunchStep
) => {
  mockUseSessionStorage
    .mockReturnValueOnce([serviceSettings, jest.fn()])
    .mockReturnValueOnce([ecfLaunchStep, jest.fn()]);
};

describe('useDeploymentSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('managed_integration', () => {
    it('returns deployment method and region when globalRegion is set', () => {
      mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_EMPTY);
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      const labels = result.current.map((f) => f.defaultMessage);
      expect(labels).toContain('Deployment method');
      expect(labels).toContain('Region');
    });

    it('omits CloudFormation stack when no family has been launched', () => {
      mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_EMPTY);
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(
        result.current.find((f) => f.defaultMessage === 'CloudFormation stack')
      ).toBeUndefined();
    });

    it('omits ECF template version when no family has been launched', () => {
      mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_EMPTY);
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(
        result.current.find((f) => f.defaultMessage === 'ECF template version')
      ).toBeUndefined();
    });

    it('omits Region when globalRegion is empty', () => {
      mockStorageCalls(SERVICE_SETTINGS_EMPTY, ECF_LAUNCH_STEP_EMPTY);
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(result.current.find((f) => f.defaultMessage === 'Region')).toBeUndefined();
    });

    it('does not include Federated Identity Name', () => {
      mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_EMPTY);
      const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
      expect(
        result.current.find((f) => f.defaultMessage.toLowerCase().includes('federated'))
      ).toBeUndefined();
    });

    describe('when an ECF family has been launched', () => {
      it('renders the CloudFormation stack row with the persisted custom name', () => {
        mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_UNIFIED);
        const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
        const stackField = result.current.find((f) => f.defaultMessage === 'CloudFormation stack');
        expect(stackField).toBeDefined();
        expect(stackField?.value).toBe('my-custom-stack');
      });

      it('falls back to the family default stack name when stackNames is absent', () => {
        mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_UNIFIED_DEFAULT);
        const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
        const stackField = result.current.find((f) => f.defaultMessage === 'CloudFormation stack');
        expect(stackField).toBeDefined();
        // ECF_UNIFIED_STACK_NAME default
        expect(stackField?.value).toBe('edot-cloud-forwarder');
      });

      it('renders the ECF template version row', () => {
        mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_UNIFIED);
        const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
        const versionField = result.current.find(
          (f) => f.defaultMessage === 'ECF template version'
        );
        expect(versionField).toBeDefined();
        expect(versionField?.value).toBe('1.10.0');
      });

      it('omits ECF template version row when version is not stored', () => {
        mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_UNIFIED_DEFAULT);
        const { result } = renderHook(() => useDeploymentSummary('managed_integration'));
        const versionField = result.current.find(
          (f) => f.defaultMessage === 'ECF template version'
        );
        expect(versionField).toBeUndefined();
      });
    });
  });

  describe('agent_based', () => {
    it('returns only fields with non-null values', () => {
      mockStorageCalls(SERVICE_SETTINGS_WITH_REGION, ECF_LAUNCH_STEP_EMPTY);
      const { result } = renderHook(() => useDeploymentSummary('agent_based'));
      // Only "Deployment method" has a non-null value; the rest are blocked on #9079
      expect(result.current).toHaveLength(1);
      expect(result.current[0].defaultMessage).toBe('Deployment method');
    });
  });
});
