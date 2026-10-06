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
  ECF_UNIFIED_STACK_NAME: 'edot-cloud-forwarder',
  ECF_OTEL_STACK_NAME: 'edot-cloud-forwarder-otel',
  ECF_CROWDSTRIKE_STACK_NAME: 'edot-cloud-forwarder-crowdstrike-fdr',
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

jest.mock('../use_ecf_template_version', () => ({
  useEcfTemplateVersion: jest.fn(() => ({
    version: '1.10.0',
    source: 'remote' as const,
    isLoading: false,
  })),
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

function makeSessionStorageMock(
  initial: {
    launchedFamilies?: string[];
    stackNames?: Record<string, string>;
    stackVersions?: Record<string, string>;
  } = {}
) {
  const setter = jest.fn();
  mockUseSessionStorage.mockReturnValue([{ launchedFamilies: [], ...initial }, setter]);
  return setter;
}

function renderSection(props: Partial<React.ComponentProps<typeof EcfDeploymentSection>> = {}) {
  const defaults = {
    ecfUnifiedConfigs: [] as React.ComponentProps<typeof EcfDeploymentSection>['ecfUnifiedConfigs'],
    ecfOtelConfigs: [] as React.ComponentProps<typeof EcfDeploymentSection>['ecfOtelConfigs'],
    ecfCrowdstrikeServices: [] as string[],
    unifiedLaunchUrl: 'https://cf.aws/unified' as string | undefined,
    otelLaunchUrl: undefined as string | undefined,
    crowdstrikeLaunchUrl: undefined as string | undefined,
    globalRegion: 'us-east-1',
    launchedFamilies: [] as React.ComponentProps<typeof EcfDeploymentSection>['launchedFamilies'],
    stackNames: {} as React.ComponentProps<typeof EcfDeploymentSection>['stackNames'],
    stackVersions: {} as React.ComponentProps<typeof EcfDeploymentSection>['stackVersions'],
    onLaunch: jest.fn() as React.ComponentProps<typeof EcfDeploymentSection>['onLaunch'],
    onStackNameChange: jest.fn() as React.ComponentProps<
      typeof EcfDeploymentSection
    >['onStackNameChange'],
    ...props,
  } satisfies React.ComponentProps<typeof EcfDeploymentSection>;
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
      makeSessionStorageMock({ launchedFamilies: [] });
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
      makeSessionStorageMock({ launchedFamilies: ['unified'] });
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
  });

  describe('onLaunch', () => {
    it('persists the launched family and the resolved version to session storage', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      const setter = makeSessionStorageMock({ launchedFamilies: [] });
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
      expect(setter).toHaveBeenCalledWith(
        expect.objectContaining({
          launchedFamilies: ['unified'],
          stackVersions: expect.objectContaining({ unified: '1.10.0' }),
        })
      );
    });

    it('deduplicates repeated launches of the same family', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      const setter = makeSessionStorageMock({ launchedFamilies: ['unified'] });
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
      const { launchedFamilies } = setter.mock.calls[0][0];
      expect(launchedFamilies.filter((f: string) => f === 'unified')).toHaveLength(1);
    });

    it('does not clobber existing stackNames when recording a new launch', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      const setter = makeSessionStorageMock({
        launchedFamilies: [],
        stackNames: { unified: 'my-custom-name' },
      });
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
      const persisted = setter.mock.calls[0][0];
      expect(persisted.stackNames?.unified).toBe('my-custom-name');
    });
  });

  describe('onStackNameChange', () => {
    it('updates stackNames for the given family without touching launchedFamilies', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      const setter = makeSessionStorageMock({ launchedFamilies: ['unified'] });
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
        result.current.sectionProps.onStackNameChange('unified', 'renamed-stack');
      });
      const persisted = setter.mock.calls[0][0];
      expect(persisted.stackNames?.unified).toBe('renamed-stack');
      expect(persisted.launchedFamilies).toContain('unified');
    });
  });
});

// ─── EcfDeploymentSection ────────────────────────────────────────────────────

describe('EcfDeploymentSection', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('accordion', () => {
    it('is open by default regardless of isDone', () => {
      // Even when all families are launched the accordion starts open so the stack name is visible.
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      // The header button exists and indicates expanded state.
      expect(screen.getByTestId('ecfDeploymentSection-headerButton')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('can be toggled closed by clicking the header', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      fireEvent.click(screen.getByTestId('ecfDeploymentSection-headerButton'));
      expect(screen.getByTestId('ecfDeploymentSection-headerButton')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });

    it('renders the Done badge when all families are launched', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('does not render Done badge when not all families are launched', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });

    it('stays open after launch (no auto-collapse)', () => {
      // Deliberately verify the old auto-collapse behaviour is gone.
      const { rerender } = renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: [],
      });
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
            launchedFamilies={['unified'] as any}
            stackNames={{}}
            stackVersions={{}}
            onLaunch={jest.fn()}
            onStackNameChange={jest.fn()}
          />
        </I18nProvider>
      );
      // The accordion must still be expanded — stack name field must be reachable.
      expect(screen.getByTestId('ecfDeploymentSection-headerButton')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });
  });

  describe('launch button state', () => {
    it('is shown and links to the launch URL before launch', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      const btn = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent('Launch CloudFormation');
    });

    it('is replaced by the confirmation text after launch', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton')
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Elastic Cloud Forwarder has been created/i)).toBeInTheDocument();
    });
  });

  describe('stack name field', () => {
    it('is hidden before launch', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton-stackNameField')
      ).not.toBeInTheDocument();
    });

    it('is shown after launch pre-filled with the family default', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackNames: {},
      });
      const field = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackNameField');
      expect(field).toBeInTheDocument();
      expect(field).toHaveValue('edot-cloud-forwarder');
    });

    it('shows the persisted name when the user has previously edited it', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackNames: { unified: 'my-renamed-stack' },
      });
      const field = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackNameField');
      expect(field).toHaveValue('my-renamed-stack');
    });

    it('calls onStackNameChange when the user edits the field', () => {
      const onStackNameChange = jest.fn();
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackNames: {},
        onStackNameChange,
      });
      const field = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackNameField');
      fireEvent.change(field, { target: { value: 'new-name' } });
      expect(onStackNameChange).toHaveBeenCalledWith('unified', 'new-name');
    });

    it('shows an inline error for invalid stack names (but does not disable Next)', () => {
      // EcfFamilyPanel validates the `stackName` prop, which in production comes from session
      // storage. To exercise the error state in a test we need a stateful wrapper that reflects
      // the user-typed value back through the prop (mimicking the real session-storage flow).
      const StackNameTestWrapper = () => {
        const [stackNames, setStackNames] = React.useState<Record<string, string>>({});
        return (
          <EcfDeploymentSection
            ecfUnifiedConfigs={[unifiedConfig('cloudtrail')]}
            ecfOtelConfigs={[]}
            ecfCrowdstrikeServices={[]}
            unifiedLaunchUrl="https://cf.aws/unified"
            otelLaunchUrl={undefined}
            crowdstrikeLaunchUrl={undefined}
            globalRegion="us-east-1"
            launchedFamilies={['unified'] as any}
            stackNames={stackNames}
            stackVersions={{}}
            onLaunch={jest.fn()}
            onStackNameChange={(_family, name) =>
              setStackNames((prev) => ({ ...prev, unified: name }))
            }
          />
        );
      };
      render(
        <I18nProvider>
          <StackNameTestWrapper />
        </I18nProvider>
      );
      const field = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackNameField');
      fireEvent.change(field, { target: { value: '1-invalid' } });
      fireEvent.blur(field);
      expect(screen.getByText(/must start with a letter/i)).toBeInTheDocument();
    });

    it('does not show an error for an empty name (treated as "use default")', () => {
      const StackNameTestWrapper = () => {
        const [stackNames, setStackNames] = React.useState<Record<string, string>>({
          unified: 'edot-cloud-forwarder',
        });
        return (
          <EcfDeploymentSection
            ecfUnifiedConfigs={[unifiedConfig('cloudtrail')]}
            ecfOtelConfigs={[]}
            ecfCrowdstrikeServices={[]}
            unifiedLaunchUrl="https://cf.aws/unified"
            otelLaunchUrl={undefined}
            crowdstrikeLaunchUrl={undefined}
            globalRegion="us-east-1"
            launchedFamilies={['unified'] as any}
            stackNames={stackNames}
            stackVersions={{}}
            onLaunch={jest.fn()}
            onStackNameChange={(_family, name) =>
              setStackNames((prev) => ({ ...prev, unified: name }))
            }
          />
        );
      };
      render(
        <I18nProvider>
          <StackNameTestWrapper />
        </I18nProvider>
      );
      const field = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackNameField');
      fireEvent.change(field, { target: { value: '' } });
      fireEvent.blur(field);
      expect(screen.queryByText(/must start with a letter/i)).not.toBeInTheDocument();
    });
  });

  describe('stack version display', () => {
    it('is hidden before launch', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      expect(screen.queryByText(/ECF version/i)).not.toBeInTheDocument();
    });

    it('shows the stored version after launch', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackVersions: { unified: '1.10.0' },
      });
      expect(screen.getByText(/1\.10\.0/)).toBeInTheDocument();
    });

    it('is absent when no version is stored', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackVersions: {},
      });
      expect(screen.queryByText(/ECF version/i)).not.toBeInTheDocument();
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
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton-reopen')
      ).not.toBeInTheDocument();
    });

    it('appears after the 5s delay', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-reopen')
      ).toBeInTheDocument();
    });
  });
});
