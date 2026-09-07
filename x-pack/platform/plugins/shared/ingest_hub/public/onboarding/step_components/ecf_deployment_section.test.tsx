/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

jest.mock('../ecf_cloudformation', () => ({
  getEcfServiceConfigs: jest.fn(),
  buildEcfUnifiedCloudFormationUrl: jest.fn(() => 'https://cf.aws/unified'),
  buildEcfOtelCloudFormationUrl: jest.fn(() => 'https://cf.aws/otel'),
  buildEcfCrowdstrikeCloudFormationUrl: jest.fn(() => 'https://cf.aws/crowdstrike'),
}));

jest.mock('../onboarding_session_storage', () => ({
  getOnboardingSessionKey: jest.fn(() => 'onboarding.aws.ecfLaunchStep'),
}));

jest.mock('../aws_service_matrix', () => ({
  AWS_SERVICES_MAP: new Map([
    ['cloudtrail', { ecfLogType: 'cloudtrail', ecfDedicatedTemplate: null }],
    ['waf', { ecfLogType: 'waf', ecfDedicatedTemplate: null }],
    ['cloudwatch_logs', { ecfLogType: 'cloudwatch_logs', ecfDedicatedTemplate: 'otel' }],
    ['crowdstrike_fdr', { ecfLogType: null, ecfDedicatedTemplate: 'crowdstrike_fdr' }],
  ]),
}));

import useSessionStorage from 'react-use/lib/useSessionStorage';
import { getEcfServiceConfigs } from '../ecf_cloudformation';
import { useEcfDeployment, EcfDeploymentSection } from './ecf_deployment_section';

const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockGetEcfServiceConfigs = getEcfServiceConfigs as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const baseInstance = (serviceId: string) => ({
  instanceId: serviceId,
  serviceId,
  name: serviceId,
  isDuplicate: false,
});

const unifiedConfig = (serviceId: string) => ({
  serviceId,
  ecfLogType: 'cloudtrail' as const,
  bucketArns: [],
  logGroupArns: [],
});
const otelConfig = (serviceId: string) => ({
  serviceId,
  ecfLogType: 'waf' as const,
  bucketArns: [],
  logGroupArns: [],
});

function makeSessionStorageMock(launchedFamilies: string[] = []) {
  const setter = jest.fn();
  mockUseSessionStorage.mockReturnValue([{ launchedFamilies }, setter]);
  return setter;
}

function renderSection(props: Partial<React.ComponentProps<typeof EcfDeploymentSection>> = {}) {
  const defaults: React.ComponentProps<typeof EcfDeploymentSection> = {
    ecfUnifiedConfigs: [],
    ecfOtelConfigs: [],
    ecfCrowdstrikeServices: [],
    unifiedLaunchUrl: 'https://cf.aws/unified',
    otelLaunchUrl: undefined,
    crowdstrikeLaunchUrl: undefined,
    globalRegion: 'us-east-1',
    launchedFamilies: [],
    onLaunch: jest.fn(),
    ...props,
  };
  return render(
    <I18nProvider>
      <EcfDeploymentSection {...defaults} />
    </I18nProvider>
  );
}

// ─── useEcfDeployment ────────────────────────────────────────────────────────

describe('useEcfDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEcfServiceConfigs.mockReturnValue([]);
    makeSessionStorageMock();
  });

  describe('hasAnyEcf', () => {
    it('is false when no instances are provided', () => {
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      expect(result.current.hasAnyEcf).toBe(false);
    });

    it('is true when getEcfServiceConfigs returns unified configs', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [baseInstance('cloudtrail')],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      expect(result.current.hasAnyEcf).toBe(true);
    });

    it('is true for crowdstrike services even with no ecf configs', () => {
      mockGetEcfServiceConfigs.mockReturnValue([]);
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [baseInstance('crowdstrike_fdr')],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      expect(result.current.hasAnyEcf).toBe(true);
    });
  });

  describe('isDone', () => {
    it('is true when no ECF services are present', () => {
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      expect(result.current.isDone).toBe(true);
    });

    it('is false when unified present and not yet launched', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      makeSessionStorageMock([]);
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [baseInstance('cloudtrail')],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      expect(result.current.isDone).toBe(false);
    });

    it('is true once all required families are launched', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      makeSessionStorageMock(['unified']);
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [baseInstance('cloudtrail')],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      expect(result.current.isDone).toBe(true);
    });

    it('is false when otel present but only unified launched', () => {
      mockGetEcfServiceConfigs.mockReturnValue([
        unifiedConfig('cloudtrail'),
        otelConfig('cloudwatch_logs'),
      ]);
      makeSessionStorageMock(['unified']);
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [baseInstance('cloudtrail'), baseInstance('cloudwatch_logs')],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      expect(result.current.isDone).toBe(false);
    });
  });

  describe('onLaunch', () => {
    it('persists the launched family to session storage', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      const setter = makeSessionStorageMock([]);
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [baseInstance('cloudtrail')],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      act(() => {
        result.current.sectionProps.onLaunch('unified');
      });
      expect(setter).toHaveBeenCalledWith({ launchedFamilies: ['unified'] });
    });

    it('deduplicates repeated launches of the same family', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      const setter = makeSessionStorageMock(['unified']);
      const { result } = renderHook(() =>
        useEcfDeployment({
          instances: [baseInstance('cloudtrail')],
          serviceVars: {},
          globalRegion: 'us-east-1',
          otlpEndpoint: undefined,
          dataFormat: 'ecs' as const,
        })
      );
      act(() => {
        result.current.sectionProps.onLaunch('unified');
      });
      // Should still only contain one 'unified' entry
      expect(setter).toHaveBeenCalledWith({ launchedFamilies: ['unified'] });
    });
  });
});

// ─── EcfDeploymentSection ────────────────────────────────────────────────────

describe('EcfDeploymentSection', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('accordion', () => {
    it('is open by default when not done', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      expect(screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton')).toBeInTheDocument();
    });

    it('is closed by default when already done', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton')
      ).not.toBeInTheDocument();
    });

    it('auto-collapses when isDone becomes true via prop update', () => {
      const { rerender } = renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: [],
      });
      expect(screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton')).toBeInTheDocument();

      rerender(
        <I18nProvider>
          <EcfDeploymentSection
            ecfUnifiedConfigs={[unifiedConfig('cloudtrail')]}
            ecfOtelConfigs={[]}
            ecfCrowdstrikeServices={[]}
            unifiedLaunchUrl="https://cf.aws/unified"
            otelLaunchUrl={undefined}
            crowdstrikeLaunchUrl={undefined}
            globalRegion="us-east-1"
            launchedFamilies={['unified']}
            onLaunch={jest.fn()}
          />
        </I18nProvider>
      );
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton')
      ).not.toBeInTheDocument();
    });

    it('renders the Done badge when all families launched', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('does not render Done badge when not all families launched', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  describe('launch button state', () => {
    it('is enabled and shows Launch CloudFormation before launch', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      const btn = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton');
      expect(btn).not.toBeDisabled();
      expect(btn).toHaveTextContent('Launch CloudFormation');
    });

    it('is disabled and shows deploying text after launch', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      // Section is closed (done=true) — click header to re-open it
      fireEvent.click(screen.getByTestId('ecfDeploymentSection-headerButton'));
      const btn = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton');
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent('CloudFormation stack deploying');
    });
  });

  describe('Reopen AWS Console link', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('is hidden immediately after launch', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      fireEvent.click(screen.getByTestId('ecfDeploymentSection-headerButton'));
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton-reopen')
      ).not.toBeInTheDocument();
    });

    it('appears after the 5s delay', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      fireEvent.click(screen.getByTestId('ecfDeploymentSection-headerButton'));

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-reopen')
      ).toBeInTheDocument();
    });
  });
});
