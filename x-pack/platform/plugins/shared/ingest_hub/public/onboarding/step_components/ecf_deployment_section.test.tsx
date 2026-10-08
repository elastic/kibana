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
  buildEcfStackConsoleUrl: jest.fn(
    (arn: string) =>
      `https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=${encodeURIComponent(
        arn
      )}`
  ),
  isEcfStackArnValid: jest.fn((arn: string) =>
    /^arn:aws(?:-us-gov|-cn)?:cloudformation:[a-z0-9-]+:\d+:stack\//.test(arn.trim())
  ),
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
    launchedServiceIds?: Record<string, string[]>;
    stackArns?: Record<string, string>;
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
    stackArns: {} as React.ComponentProps<typeof EcfDeploymentSection>['stackArns'],
    isStaleByFamily: {
      unified: false,
      otel: false,
      crowdstrike: false,
    } as React.ComponentProps<typeof EcfDeploymentSection>['isStaleByFamily'],
    onLaunch: jest.fn() as React.ComponentProps<typeof EcfDeploymentSection>['onLaunch'],
    onStackNameChange: jest.fn() as React.ComponentProps<
      typeof EcfDeploymentSection
    >['onStackNameChange'],
    onStackArnChange: jest.fn() as React.ComponentProps<
      typeof EcfDeploymentSection
    >['onStackArnChange'],
    onUpdateStack: jest.fn() as React.ComponentProps<typeof EcfDeploymentSection>['onUpdateStack'],
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

    it('is true once all required families are launched, none are stale, and all have valid ARNs', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      makeSessionStorageMock({
        launchedFamilies: ['unified'],
        launchedServiceIds: { unified: ['cloudtrail'] },
        stackArns: { unified: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid' },
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
      expect(result.current.isDone).toBe(true);
    });

    it('is false when all families are launched but no ARN has been provided', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      makeSessionStorageMock({
        launchedFamilies: ['unified'],
        launchedServiceIds: { unified: ['cloudtrail'] },
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
      expect(result.current.isDone).toBe(false);
    });

    it('is false when a launched family is stale', () => {
      mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail')]);
      // snapshot has vpcflow, current selection is cloudtrail → stale
      makeSessionStorageMock({
        launchedFamilies: ['unified'],
        launchedServiceIds: { unified: ['vpcflow'] },
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
      expect(result.current.isDone).toBe(false);
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

    it('renders the Done badge when all families are launched and have valid ARNs', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: { unified: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid' },
      });
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('does not render the Done badge when launched but no ARN provided', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: {},
      });
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });

    it('does not render Done badge when not all families are launched', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });

    it('does not render Done badge when a launched family is stale', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        isStaleByFamily: { unified: true, otel: false, crowdstrike: false },
      });
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
            stackArns={{}}
            isStaleByFamily={{ unified: false, otel: false, crowdstrike: false }}
            onLaunch={jest.fn()}
            onStackNameChange={jest.fn()}
            onStackArnChange={jest.fn()}
            onUpdateStack={jest.fn()}
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

    it('remains visible after launch until a valid ARN is provided', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: {},
      });
      // Launch button is still shown — user may not have completed CFN setup yet
      expect(screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton')).toBeInTheDocument();
      // ARN field is also shown post-launch
      expect(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackArnField')
      ).toBeInTheDocument();
    });

    it('is hidden once a valid ARN has been provided', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: { unified: 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid' },
      });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton')
      ).not.toBeInTheDocument();
    });

    it('is hidden when the family is stale (Update stack is shown instead)', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: {},
        isStaleByFamily: { unified: true, otel: false, crowdstrike: false },
      });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-staleCallout')
      ).toBeInTheDocument();
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
            stackArns={{}}
            isStaleByFamily={{ unified: false, otel: false, crowdstrike: false }}
            onLaunch={jest.fn()}
            onStackNameChange={(_family, name) =>
              setStackNames((prev) => ({ ...prev, unified: name }))
            }
            onStackArnChange={jest.fn()}
            onUpdateStack={jest.fn()}
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
            stackArns={{}}
            isStaleByFamily={{ unified: false, otel: false, crowdstrike: false }}
            onLaunch={jest.fn()}
            onStackNameChange={(_family, name) =>
              setStackNames((prev) => ({ ...prev, unified: name }))
            }
            onStackArnChange={jest.fn()}
            onUpdateStack={jest.fn()}
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
    it('is never shown — the button has been removed in favour of the Launch button staying visible until an ARN is pasted', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
      });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton-reopen')
      ).not.toBeInTheDocument();
    });
  });

  describe('stack ARN field', () => {
    it('is hidden before launch', () => {
      renderSection({ ecfUnifiedConfigs: [unifiedConfig('cloudtrail')], launchedFamilies: [] });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton-stackArnField')
      ).not.toBeInTheDocument();
    });

    it('is shown after launch with an empty value when no ARN is stored', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: {},
      });
      const field = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackArnField');
      expect(field).toBeInTheDocument();
      expect(field).toHaveValue('');
    });

    it('shows the stored ARN when one has been pasted', () => {
      const arn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: { unified: arn },
      });
      expect(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackArnField')
      ).toHaveValue(arn);
    });

    it('calls onStackArnChange when the user edits the ARN field', () => {
      const onStackArnChange = jest.fn();
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        onStackArnChange,
      });
      const field = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackArnField');
      fireEvent.change(field, {
        target: { value: 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/uuid' },
      });
      expect(onStackArnChange).toHaveBeenCalledWith(
        'unified',
        'arn:aws:cloudformation:us-east-1:123456789012:stack/s/uuid'
      );
    });

    it('shows a check icon when a valid ARN is stored', () => {
      const arn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: { unified: arn },
        isStaleByFamily: { unified: false, otel: false, crowdstrike: false },
      });
      // The View stack button was removed; the ARN field shows a check icon instead.
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton-viewStack')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-stackArnField')
      ).toHaveValue(arn);
    });
  });

  describe('stale callout', () => {
    it('is not shown when the family is not stale', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        isStaleByFamily: { unified: false, otel: false, crowdstrike: false },
      });
      expect(
        screen.queryByTestId('ecfDeploymentSection-unifiedLaunchButton-staleCallout')
      ).not.toBeInTheDocument();
    });

    it('is shown when the family is stale', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        isStaleByFamily: { unified: true, otel: false, crowdstrike: false },
      });
      expect(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-staleCallout')
      ).toBeInTheDocument();
      expect(screen.getByText(/Services changed/i)).toBeInTheDocument();
    });

    it('shows a disabled Update stack button when no ARN is stored', () => {
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: {},
        isStaleByFamily: { unified: true, otel: false, crowdstrike: false },
      });
      const btn = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-updateStackButton');
      expect(btn).toBeDisabled();
    });

    it('shows an enabled Update stack button when a valid ARN is stored', () => {
      const arn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: { unified: arn },
        isStaleByFamily: { unified: true, otel: false, crowdstrike: false },
      });
      const btn = screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-updateStackButton');
      expect(btn).not.toBeDisabled();
    });

    it('calls onUpdateStack when the Update stack button is clicked', () => {
      const arn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
      const onUpdateStack = jest.fn();
      renderSection({
        ecfUnifiedConfigs: [unifiedConfig('cloudtrail')],
        launchedFamilies: ['unified'],
        stackArns: { unified: arn },
        isStaleByFamily: { unified: true, otel: false, crowdstrike: false },
        onUpdateStack,
      });
      fireEvent.click(
        screen.getByTestId('ecfDeploymentSection-unifiedLaunchButton-updateStackButton')
      );
      expect(onUpdateStack).toHaveBeenCalledWith('unified');
    });
  });
});

// ─── useEcfDeployment — staleness detection ───────────────────────────────────

describe('useEcfDeployment staleness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEcfServiceConfigs.mockReturnValue([]);
  });

  it('isStaleByFamily is false for all families when none have been launched', () => {
    makeSessionStorageMock({ launchedFamilies: [] });
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
    expect(result.current.sectionProps.isStaleByFamily.unified).toBe(false);
  });

  it('isStaleByFamily is false when no launchedServiceIds snapshot exists (old session)', () => {
    makeSessionStorageMock({ launchedFamilies: ['unified'] });
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
    expect(result.current.sectionProps.isStaleByFamily.unified).toBe(false);
  });

  it('isStaleByFamily is false when service IDs match the snapshot', () => {
    makeSessionStorageMock({
      launchedFamilies: ['unified'],
      launchedServiceIds: { unified: ['cloudtrail'] },
    });
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
    expect(result.current.sectionProps.isStaleByFamily.unified).toBe(false);
  });

  it('isStaleByFamily is true when a service was added after launch', () => {
    makeSessionStorageMock({
      launchedFamilies: ['unified'],
      launchedServiceIds: { unified: ['cloudtrail'] },
    });
    mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail'), unifiedConfig('waf')]);
    const { result } = renderHook(() =>
      useEcfDeployment({
        instances: [baseInstance('cloudtrail'), baseInstance('waf')],
        serviceVars: {},
        globalRegion: 'us-east-1',
        otlpEndpoint: undefined,
        dataFormat: 'ecs' as const,
      })
    );
    expect(result.current.sectionProps.isStaleByFamily.unified).toBe(true);
  });

  it('isStaleByFamily is true when a service was removed after launch', () => {
    makeSessionStorageMock({
      launchedFamilies: ['unified'],
      launchedServiceIds: { unified: ['cloudtrail', 'waf'] },
    });
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
    expect(result.current.sectionProps.isStaleByFamily.unified).toBe(true);
  });

  it('onLaunch stores the current service IDs as launchedServiceIds snapshot', () => {
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
    const persisted = setter.mock.calls[0][0];
    expect(persisted.launchedServiceIds?.unified).toEqual(['cloudtrail']);
  });

  it('onUpdateStack updates the launchedServiceIds snapshot to the current set', () => {
    mockGetEcfServiceConfigs.mockReturnValue([unifiedConfig('cloudtrail'), unifiedConfig('waf')]);
    const setter = makeSessionStorageMock({
      launchedFamilies: ['unified'],
      launchedServiceIds: { unified: ['cloudtrail'] },
    });
    const { result } = renderHook(() =>
      useEcfDeployment({
        instances: [baseInstance('cloudtrail'), baseInstance('waf')],
        serviceVars: {},
        globalRegion: 'us-east-1',
        otlpEndpoint: undefined,
        dataFormat: 'ecs' as const,
      })
    );
    act(() => {
      result.current.sectionProps.onUpdateStack('unified');
    });
    const persisted = setter.mock.calls[0][0];
    expect(persisted.launchedServiceIds?.unified).toEqual(['cloudtrail', 'waf']);
  });

  it('onStackArnChange stores the ARN for the given family', () => {
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
    const arn = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
    act(() => {
      result.current.sectionProps.onStackArnChange('unified', arn);
    });
    const persisted = setter.mock.calls[0][0];
    expect(persisted.stackArns?.unified).toBe(arn);
  });

  it('isStaleByFamily is false when all services of a launched family are removed', () => {
    // Family was launched with cloudtrail; all services were subsequently deselected.
    makeSessionStorageMock({
      launchedFamilies: ['unified'],
      launchedServiceIds: { unified: ['cloudtrail'] },
    });
    // No unified configs — the family has no active services
    mockGetEcfServiceConfigs.mockReturnValue([]);
    const { result } = renderHook(() =>
      useEcfDeployment({
        instances: [],
        serviceVars: {},
        globalRegion: 'us-east-1',
        otlpEndpoint: undefined,
        dataFormat: 'ecs' as const,
      })
    );
    // Family is no longer active — should not be considered stale (no panel to interact with)
    expect(result.current.sectionProps.isStaleByFamily.unified).toBe(false);
    // isDone should also not be blocked by this case
    expect(result.current.isDone).toBe(true);
  });
});
