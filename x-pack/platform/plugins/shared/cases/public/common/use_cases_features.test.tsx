/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { useCasesFeatures } from './use_cases_features';
import { TestProviders } from './mock/test_providers';
import type { LicenseType } from '@kbn/licensing-types';
import { LICENSE_TYPE } from '@kbn/licensing-types';
import { CaseMetricsFeature } from '../../common/types/api';

describe('useCasesFeatures', () => {
  it('enables sync alerts, extract observables, and the observables table for the security owner', () => {
    const { result } = renderHook(() => useCasesFeatures(), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        isSyncAlertsEnabled: true,
        isObservablesFeatureEnabled: true,
        isExtractObservablesEnabled: true,
        hasCaseSettings: true,
      })
    );
  });

  it('disables sync/extract and the observables table for the observability owner', () => {
    const { result } = renderHook(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders owner={['observability']}>{children}</TestProviders>
      ),
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        isSyncAlertsEnabled: false,
        isObservablesFeatureEnabled: false,
        isExtractObservablesEnabled: false,
        hasCaseSettings: false,
      })
    );
  });

  it('disables sync/extract but keeps the observables table for the stack owner', () => {
    const { result } = renderHook(() => useCasesFeatures(), {
      wrapper: ({ children }) => <TestProviders owner={['cases']}>{children}</TestProviders>,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        isSyncAlertsEnabled: false,
        isObservablesFeatureEnabled: true,
        isExtractObservablesEnabled: false,
        hasCaseSettings: false,
      })
    );
  });

  it('looks up OWNER_INFO for an explicit caseOwner even when the host did not pin one', () => {
    const { result } = renderHook(() => useCasesFeatures('securitySolution'), {
      wrapper: ({ children }) => <TestProviders owner={[]}>{children}</TestProviders>,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        isSyncAlertsEnabled: true,
        isExtractObservablesEnabled: true,
        isObservablesFeatureEnabled: true,
      })
    );
  });

  it('falls back to the context owner when caseOwner is an empty string', () => {
    const { result } = renderHook(() => useCasesFeatures(''), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        isSyncAlertsEnabled: true,
        isExtractObservablesEnabled: true,
      })
    );
  });

  it.each([
    [{ all: false }, false],
    [{ all: true }, true],
  ])(
    'gates sync alerts on alerts.all (%j → isSyncAlertsEnabled=%s)',
    (alerts, isSyncAlertsEnabled) => {
      const { result } = renderHook(() => useCasesFeatures(), {
        wrapper: ({ children }) => <TestProviders features={{ alerts }}>{children}</TestProviders>,
      });

      expect(result.current.isSyncAlertsEnabled).toBe(isSyncAlertsEnabled);
    }
  );

  it('returns the metrics correctly', async () => {
    const { result } = renderHook(() => useCasesFeatures(), {
      wrapper: ({ children }) => (
        <TestProviders features={{ metrics: [CaseMetricsFeature.CONNECTORS] }}>
          {children}
        </TestProviders>
      ),
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        metricsFeatures: [CaseMetricsFeature.CONNECTORS],
        hasCaseSettings: true,
      })
    );
  });

  describe('hasCaseSettings', () => {
    it('is true when metrics are enabled even though sync and extract are off', () => {
      const { result } = renderHook(() => useCasesFeatures(), {
        wrapper: ({ children }) => (
          <TestProviders owner={['cases']} features={{ metrics: [CaseMetricsFeature.CONNECTORS] }}>
            {children}
          </TestProviders>
        ),
      });

      expect(result.current.hasCaseSettings).toBe(true);
    });
  });

  const licenseTests: Array<[LicenseType, boolean]> = (Object.keys(LICENSE_TYPE) as LicenseType[])
    .filter((type: LicenseType) => isNaN(Number(type)))
    .map((type) => [
      type,
      type === 'platinum' || type === 'enterprise' || type === 'trial' ? true : false,
    ]);

  it('allows gold features on gold license', () => {
    const license = licensingMock.createLicense({
      license: { type: 'gold' },
    });

    const { result } = renderHook(() => useCasesFeatures(), {
      wrapper: ({ children }) => <TestProviders license={license}>{children}</TestProviders>,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        connectorsAuthorized: true,
      })
    );
  });

  it.each(licenseTests)(
    'allows platinum features on a platinum license (license = %s)',
    async (type, expectedResult) => {
      const license = licensingMock.createLicense({
        license: { type },
      });

      const { result } = renderHook(() => useCasesFeatures(), {
        wrapper: ({ children }) => <TestProviders license={license}>{children}</TestProviders>,
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          isSyncAlertsEnabled: true,
          metricsFeatures: [],
          caseAssignmentAuthorized: expectedResult,
          pushToServiceAuthorized: expectedResult,
          observablesAuthorized: expectedResult,
          isObservablesFeatureEnabled: true,
        })
      );
    }
  );
});
