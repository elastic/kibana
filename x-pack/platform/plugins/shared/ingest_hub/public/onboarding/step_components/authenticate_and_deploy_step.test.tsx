/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('./authenticate_and_deploy_step/use_deploy', () => ({
  useDeploy: jest.fn(),
}));

jest.mock('./authenticate_and_deploy_step/deployment_method_card', () => ({
  DeploymentMethodCard: jest.fn(() => null),
}));

jest.mock('./authenticate_and_deploy_step/managed_integrations_section', () => ({
  ManagedIntegrationsSection: jest.fn(),
}));

jest.mock('./ecf_deployment_section', () => ({
  useEcfDeployment: jest.fn(),
  EcfDeploymentSection: jest.fn(),
}));

jest.mock('./authenticate_and_deploy_step/use_agent_based_deploy', () => ({
  useAgentBasedDeploy: jest.fn(),
}));

jest.mock('./authenticate_and_deploy_step/agent_based_section', () => ({
  AgentBasedSection: jest.fn(() => null),
}));

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(() => ({ services: { cloud: undefined } })),
}));

jest.mock('./authenticate_and_deploy_step/use_onboarding_so', () => ({
  useOnboardingSO: jest.fn(),
}));

jest.mock('./authenticate_and_deploy_step/package_inputs', () => ({
  buildIacIntegrations: jest.fn(),
}));

jest.mock('../use_aws_identity_federation_enabled', () => ({
  useAwsIdentityFederationEnabled: jest.fn(),
}));

import { useOnboardingFlow } from '../onboarding_flow_context';
import type { AwsServiceMatrixEntry } from '../aws_service_matrix';
import { buildIacIntegrations } from './authenticate_and_deploy_step/package_inputs';
import { useDeploy } from './authenticate_and_deploy_step/use_deploy';
import { DeploymentMethodCard } from './authenticate_and_deploy_step/deployment_method_card';
import { useOnboardingSO } from './authenticate_and_deploy_step/use_onboarding_so';
import { ManagedIntegrationsSection } from './authenticate_and_deploy_step/managed_integrations_section';
import { useEcfDeployment, EcfDeploymentSection } from './ecf_deployment_section';
import { useAgentBasedDeploy } from './authenticate_and_deploy_step/use_agent_based_deploy';
import { AgentBasedSection } from './authenticate_and_deploy_step/agent_based_section';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useAwsIdentityFederationEnabled } from '../use_aws_identity_federation_enabled';
import { AuthenticateAndDeployStep } from './authenticate_and_deploy_step';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseDeploy = useDeploy as jest.Mock;
const MockDeploymentMethodCard = DeploymentMethodCard as unknown as jest.Mock;
const mockUseOnboardingSO = useOnboardingSO as jest.Mock;
const MockManagedIntegrationsSection = ManagedIntegrationsSection as unknown as jest.Mock;
const mockUseEcfDeployment = useEcfDeployment as jest.Mock;
const MockEcfDeploymentSection = EcfDeploymentSection as unknown as jest.Mock;
const mockUseAgentBasedDeploy = useAgentBasedDeploy as jest.Mock;
const MockAgentBasedSection = AgentBasedSection as unknown as jest.Mock;
const mockUseSessionStorage = useSessionStorage as jest.Mock;
const mockBuildIacIntegrations = buildIacIntegrations as jest.Mock;
const mockUseAwsIdentityFederationEnabled = useAwsIdentityFederationEnabled as jest.Mock;

function getLastMiSectionProps(): { showIdentityFederation: boolean } {
  const { calls } = MockManagedIntegrationsSection.mock;
  return calls[calls.length - 1][0];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const miService: AwsServiceMatrixEntry = {
  id: 'guardduty',
  name: 'AWS GuardDuty',
  category: 'security_identity_compliance',
  signalTypes: ['logs'],
  dataStreams: [],
  packageName: 'aws',
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  identityFederationSupported: true,
  defaultEnabled: true,
  defaultEnabledInputs: [],
  showInUI: true,
  isManifestLoaded: true,
  isManifestError: false,
  isStaticAgentBasedOnly: false,
};

const ecfService: AwsServiceMatrixEntry = {
  id: 'cloudtrail',
  name: 'AWS CloudTrail',
  category: 'management_governance',
  signalTypes: ['logs'],
  dataStreams: [],
  packageName: 'aws',
  deploymentMethods: [{ method: 'ecf', preferred: true }],
  identityFederationSupported: false,
  defaultEnabled: true,
  defaultEnabledInputs: [],
  showInUI: true,
  isManifestLoaded: true,
  isManifestError: false,
  isStaticAgentBasedOnly: false,
};

const awsServicesMapWithMI = new Map([['guardduty', miService]]);
const awsServicesMapEmpty = new Map();

function makeDeployReturn(
  overrides: {
    handleDeploy?: jest.Mock;
    isDeploying?: boolean;
    failedInstances?: string[];
    isAlreadyDeployed?: boolean;
    deployGroups?: unknown[];
  } = {}
) {
  return {
    handleDeploy: overrides.handleDeploy ?? jest.fn(),
    isDeploying: overrides.isDeploying ?? false,
    failedInstances: overrides.failedInstances ?? [],
    isAlreadyDeployed: overrides.isAlreadyDeployed ?? false,
    deployGroups: overrides.deployGroups ?? [],
  };
}

function makeEcfReturn(
  overrides: { hasAnyEcf?: boolean; isDone?: boolean } = {}
): ReturnType<typeof useEcfDeployment> {
  return {
    hasAnyEcf: overrides.hasAnyEcf ?? false,
    isDone: overrides.isDone ?? false,
    ecfServiceIds: new Set(),
    sectionProps: {
      ecfUnifiedConfigs: [],
      ecfOtelConfigs: [],
      ecfCrowdstrikeServices: [],
      unifiedLaunchUrl: undefined,
      otelLaunchUrl: undefined,
      crowdstrikeLaunchUrl: undefined,
      globalRegion: 'us-east-1',
      launchedFamilies: [],
      stackNames: {},
      stackVersions: {},
      onLaunch: jest.fn(),
      onStackNameChange: jest.fn(),
    },
  };
}

function renderStep(onContinue = jest.fn(), onBack?: () => void) {
  return render(
    <I18nProvider>
      <AuthenticateAndDeployStep onContinue={onContinue} onBack={onBack} />
    </I18nProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthenticateAndDeployStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['guardduty'], dataFormat: 'json' },
      awsServicesMap: awsServicesMapWithMI,
      deploymentMethod: 'managed_integration',
      setDeploymentMethod: jest.fn(),
      detectAndReviewStep: {
        serviceStatuses: {},
        policyIdsByInstance: {},
        onboardingDeploymentId: undefined,
      },
      updateDetectAndReviewStep: jest.fn(),
      refetchAwsServiceMatrix: jest.fn(),
    });
    mockUseOnboardingSO.mockReturnValue({
      createDeployment: jest.fn().mockResolvedValue(null),
      updateDeployment: jest.fn().mockResolvedValue(true),
      persistDeploymentId: jest.fn(),
    });
    mockUseAgentBasedDeploy.mockReturnValue({
      targets: [],
      isDeploying: false,
      failedInstances: [],
      isAlreadyDeployed: false,
      handleDeploy: jest.fn().mockResolvedValue({ failed: false }),
    });
    // clearAllMocks wipes the factory's default implementation, so restore it here.
    MockAgentBasedSection.mockImplementation(() => null);
    mockUseDeploy.mockReturnValue(makeDeployReturn());
    mockUseEcfDeployment.mockReturnValue(makeEcfReturn());
    mockUseSessionStorage.mockReturnValue([
      { globalRegion: 'us-east-1', serviceVars: {}, instances: [] },
      jest.fn(),
    ]);
    mockBuildIacIntegrations.mockReturnValue([]);
    mockUseAwsIdentityFederationEnabled.mockReturnValue(true);
    MockManagedIntegrationsSection.mockImplementation(
      ({ onDeploy, hasFailed }: { onDeploy: () => void; hasFailed: boolean }) => (
        <div>
          <button data-test-subj="mock-deploy-btn" onClick={onDeploy}>
            Deploy
          </button>
          {hasFailed && <span data-test-subj="mock-failed">Failed</span>}
        </div>
      )
    );
    MockEcfDeploymentSection.mockImplementation(
      ({ onLaunch }: { onLaunch: (f: string) => void }) => (
        <div>
          <button data-test-subj="mock-ecf-launch-btn" onClick={() => onLaunch('unified')}>
            Launch CloudFormation
          </button>
        </div>
      )
    );
  });

  describe('Next button gating — MI services present', () => {
    it('Next is disabled initially', () => {
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next enables after deploy with no failures', () => {
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });

    it('Next remains disabled when isDeploying is true', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ isDeploying: true }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next remains disabled after deploy with failures', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ failedInstances: ['guardduty'] }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('passes hasFailed=true to section after failed deploy', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ failedInstances: ['guardduty'] }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('mock-failed')).toBeInTheDocument();
    });
  });

  describe('Federated Identity integration set', () => {
    it('builds iacIntegrations from every deploy-group member and stored serviceVars, and passes it down', () => {
      // The hook's deployGroups are the reconciled instances Deploy will create — duplicates get
      // their own group, so the template must be built from the flattened member list.
      const original = {
        instance: {
          instanceId: 'guardduty',
          serviceId: 'guardduty',
          name: 'GD',
          isDuplicate: false,
        },
        service: miService,
      };
      const duplicate = {
        instance: {
          instanceId: 'guardduty__dup-1',
          serviceId: 'guardduty',
          name: 'GD [Duplicate]',
          isDuplicate: true,
        },
        service: miService,
      };
      const deployGroups = [
        {
          groupId: 'aws',
          instanceIds: ['guardduty'],
          members: [original],
          isDuplicateGroup: false,
        },
        {
          groupId: 'guardduty__dup-1',
          instanceIds: ['guardduty__dup-1'],
          members: [duplicate],
          isDuplicateGroup: true,
        },
      ];
      const serviceVars = {
        guardduty: { enabledDataStreams: ['guardduty'], varsByDataStream: {} },
        'guardduty__dup-1': { enabledDataStreams: ['guardduty'], varsByDataStream: {} },
      };
      const integrations = [
        { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }] },
      ];
      mockUseDeploy.mockReturnValue(makeDeployReturn({ deployGroups }));
      mockUseSessionStorage.mockReturnValue([
        { globalRegion: 'us-east-1', serviceVars, instances: [] },
        jest.fn(),
      ]);
      mockBuildIacIntegrations.mockReturnValue(integrations);

      renderStep();

      expect(mockBuildIacIntegrations).toHaveBeenCalledWith([original, duplicate], serviceVars);
      expect(MockManagedIntegrationsSection).toHaveBeenCalledWith(
        expect.objectContaining({ iacIntegrations: integrations }),
        expect.anything()
      );
    });
  });

  describe('Next button gating — already deployed', () => {
    it('Next is enabled immediately when isAlreadyDeployed', () => {
      mockUseDeploy.mockReturnValue(makeDeployReturn({ isAlreadyDeployed: true }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });
  });

  describe('persisted failure survives remount', () => {
    // This is the invariant review comment r3842293220 asked about:
    // a user who deploys, gets an error, navigates Back/Next, and returns to Step 3 must still see
    // the error callout and Next must stay disabled — the hook seeds failedInstances from session
    // storage, so the local state does not reset on remount.

    it('hasFailed=true when hook returns non-empty failedInstances on first render (no deploy attempted)', () => {
      // Simulates the hook having been seeded from persisted detectAndReviewStep.failedInstances.
      mockUseDeploy.mockReturnValue(
        makeDeployReturn({ failedInstances: ['guardduty'], isDeploying: false })
      );
      renderStep();
      // hasFailed must be true without a prior deploy click in this render cycle.
      expect(screen.getByTestId('mock-failed')).toBeInTheDocument();
    });

    it('Next stays disabled when hook returns failures on first render (no deploy attempted)', () => {
      mockUseDeploy.mockReturnValue(
        makeDeployReturn({ failedInstances: ['guardduty'], isDeploying: false })
      );
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });
  });

  describe('Next button gating — no MI services', () => {
    it('Next is enabled without deploying when no MI or ECF services', () => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: [], dataFormat: 'json' },
        awsServicesMap: awsServicesMapEmpty,
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: {
          serviceStatuses: {},
          policyIdsByInstance: {},
          onboardingDeploymentId: undefined,
        },
        updateDetectAndReviewStep: jest.fn(),
      });
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: false }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });
  });

  describe('deploy routing', () => {
    it('initial deploy calls handleDeploy with no args', () => {
      const mockHandleDeploy = jest.fn();
      mockUseDeploy.mockReturnValue(makeDeployReturn({ handleDeploy: mockHandleDeploy }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(mockHandleDeploy).toHaveBeenCalledTimes(1);
      expect(mockHandleDeploy).toHaveBeenCalledWith();
    });

    it('retry calls handleDeploy with failed instance ids', () => {
      const mockHandleDeploy = jest.fn();
      mockUseDeploy.mockReturnValue(
        makeDeployReturn({ handleDeploy: mockHandleDeploy, failedInstances: ['guardduty'] })
      );
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(mockHandleDeploy).toHaveBeenCalledWith(['guardduty']);
    });
  });

  describe('Next calls onContinue', () => {
    it('invokes onContinue when Next clicked after successful deploy', () => {
      const onContinue = jest.fn();
      renderStep(onContinue);
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      fireEvent.click(screen.getByTestId('authenticateAndDeployStep-nextButton'));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('agent-based — stale failure does not leak in', () => {
    // Regression: failedInstances is one shared session key that the MI path also writes, so an
    // un-gated hasFailed check surfaced a stale MI failure (or one from a previous session) as an
    // agent-based "Deployment failed" callout that survived restarting onboarding.
    const agentService = {
      id: 'vpcflow',
      name: 'AWS VPC Flow Logs',
      deploymentMethods: [{ method: 'managed_integration', preferred: true }],
      identityFederationSupported: true,
      showInUI: true,
      isManifestLoaded: true,
      isManifestError: false,
      isStaticAgentBasedOnly: false,
    };

    beforeEach(() => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['vpcflow'], dataFormat: 'json' },
        awsServicesMap: new Map([['vpcflow', agentService]]),
        deploymentMethod: 'agent_based',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
      });
      MockAgentBasedSection.mockImplementation(({ hasFailed }: { hasFailed: boolean }) =>
        hasFailed ? <span data-test-subj="mock-agent-failed">Failed</span> : null
      );
    });

    it('does not pass hasFailed when the hook reports failures with no deploy attempted', () => {
      mockUseAgentBasedDeploy.mockReturnValue({
        targets: [
          {
            groupId: 'aws',
            instanceIds: ['vpcflow'],
            members: [{ instance: { instanceId: 'vpcflow' }, service: agentService }],
            isDuplicateGroup: false,
          },
        ],
        isDeploying: false,
        failedInstances: ['vpcflow'],
        isAlreadyDeployed: false,
        handleDeploy: jest.fn().mockResolvedValue({ failed: true }),
      });
      renderStep();
      expect(screen.queryByTestId('mock-agent-failed')).not.toBeInTheDocument();
    });

    it('passes hasFailed once a deploy has actually been attempted', () => {
      const handleDeploy = jest.fn().mockResolvedValue({ failed: true });
      mockUseAgentBasedDeploy.mockReturnValue({
        targets: [
          {
            groupId: 'aws',
            instanceIds: ['vpcflow'],
            members: [{ instance: { instanceId: 'vpcflow' }, service: agentService }],
            isDuplicateGroup: false,
          },
        ],
        isDeploying: false,
        failedInstances: ['vpcflow'],
        isAlreadyDeployed: false,
        handleDeploy,
      });
      MockAgentBasedSection.mockImplementation(
        ({
          onDeploy,
          hasFailed,
          onNextReadyChange,
        }: {
          onDeploy: () => void;
          hasFailed: boolean;
          onNextReadyChange?: (ready: boolean) => void;
        }) => {
          onNextReadyChange?.(true);
          return (
            <div>
              <button data-test-subj="mock-agent-deploy-btn" onClick={onDeploy}>
                Add agent
              </button>
              {hasFailed && <span data-test-subj="mock-agent-failed">Failed</span>}
            </div>
          );
        }
      );
      renderStep();
      expect(screen.queryByTestId('mock-agent-failed')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('mock-agent-deploy-btn'));
      expect(screen.getByTestId('mock-agent-failed')).toBeInTheDocument();
    });

    describe('Next button — agent-based deploy', () => {
      const agentTargets = [
        {
          groupId: 'aws',
          instanceIds: ['vpcflow'],
          members: [{ instance: { instanceId: 'vpcflow' }, service: agentService }],
          isDuplicateGroup: false,
        },
      ];

      beforeEach(() => {
        // Render a section that is ready (signals Next readiness immediately).
        MockAgentBasedSection.mockImplementation(
          ({
            onDeploy,
            onNextReadyChange,
          }: {
            onDeploy: () => void;
            onNextReadyChange?: (ready: boolean) => void;
          }) => {
            onNextReadyChange?.(true);
            return (
              <div>
                <button data-test-subj="mock-agent-deploy-btn" onClick={onDeploy}>
                  Add agent
                </button>
              </div>
            );
          }
        );
      });

      it('calls onContinue when agent deploy succeeds', async () => {
        const handleDeploy = jest.fn().mockResolvedValue({ failed: false });
        mockUseAgentBasedDeploy.mockReturnValue({
          targets: agentTargets,
          isDeploying: false,
          failedInstances: [],
          isAlreadyDeployed: false,
          handleDeploy,
        });
        const onContinue = jest.fn();
        renderStep(onContinue);

        fireEvent.click(screen.getByTestId('authenticateAndDeployStep-nextButton'));
        await waitFor(() => expect(handleDeploy).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
      });

      it('does NOT call onContinue when agent deploy fails', async () => {
        const handleDeploy = jest.fn().mockResolvedValue({ failed: true });
        mockUseAgentBasedDeploy.mockReturnValue({
          targets: agentTargets,
          isDeploying: false,
          failedInstances: [],
          isAlreadyDeployed: false,
          handleDeploy,
        });
        const onContinue = jest.fn();
        renderStep(onContinue);

        fireEvent.click(screen.getByTestId('authenticateAndDeployStep-nextButton'));
        await waitFor(() => expect(handleDeploy).toHaveBeenCalledTimes(1));
        // Give enough time for any async resolution to happen.
        await new Promise((r) => setTimeout(r, 0));
        expect(onContinue).not.toHaveBeenCalled();
      });

      it('skips deploy and calls onContinue immediately when isAgentDone (Back+Next re-deploy guard)', async () => {
        // Regression: after a successful deploy the user can go Back then Next again.
        // Without the guard, deployToExistingAgentPolicies would fire again and create duplicate
        // package policies on the same agent policy.
        const handleDeploy = jest.fn().mockResolvedValue({ failed: false });
        mockUseAgentBasedDeploy.mockReturnValue({
          targets: agentTargets,
          isDeploying: false,
          failedInstances: [],
          isAlreadyDeployed: true, // already deployed → isAgentDone = true
          handleDeploy,
        });
        const onContinue = jest.fn();
        renderStep(onContinue);

        fireEvent.click(screen.getByTestId('authenticateAndDeployStep-nextButton'));
        await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
        // handleDeploy must NOT be called — the guard short-circuits before it.
        expect(handleDeploy).not.toHaveBeenCalled();
      });

      it('does NOT call handleDeploy with create-policy args when agentPolicyId is already set', async () => {
        // Regression: when the flyout already created the agent policy on a previous attempt,
        // handleDeploy must route to the existing-policy path, not create a second policy.
        // This is enforced inside use_agent_based_deploy (agentPolicyId condition), but we verify
        // here that Next does call handleDeploy (so the hook's routing logic runs) and that
        // onContinue fires on success — i.e. we don't bypass the deploy entirely.
        const handleDeploy = jest.fn().mockResolvedValue({ failed: false });
        mockUseAgentBasedDeploy.mockReturnValue({
          targets: agentTargets,
          isDeploying: false,
          failedInstances: [],
          isAlreadyDeployed: false,
          handleDeploy,
        });
        mockUseOnboardingFlow.mockReturnValue({
          servicesStep: { selectedServiceIds: ['vpcflow'], dataFormat: 'json' },
          awsServicesMap: new Map([['vpcflow', agentService]]),
          deploymentMethod: 'agent_based',
          setDeploymentMethod: jest.fn(),
          // agentBasedDeployment has agentPolicyId already set (flyout created it).
          agentBasedDeployment: { agentPolicyId: 'existing-policy-id', agentHostsMode: 'new' },
          detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
          updateDetectAndReviewStep: jest.fn(),
        });
        const onContinue = jest.fn();
        renderStep(onContinue);

        fireEvent.click(screen.getByTestId('authenticateAndDeployStep-nextButton'));
        await waitFor(() => expect(handleDeploy).toHaveBeenCalledTimes(1));
        // The hook (mocked here) was called — its internal routing (existing vs new policy) is
        // tested in use_agent_based_deploy. We confirm Next navigates on success.
        await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
      });
    });
  });

  describe('ECF section — Next button gating', () => {
    beforeEach(() => {
      // Switch to ECF-only service (no MI)
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['cloudtrail'], dataFormat: 'json' },
        awsServicesMap: new Map([['cloudtrail', ecfService]]),
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: {
          serviceStatuses: {},
          policyIdsByInstance: {},
          onboardingDeploymentId: undefined,
        },
        updateDetectAndReviewStep: jest.fn(),
      });
    });

    it('Next is disabled when ECF is present and not yet launched', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: false }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next is enabled after ECF launch button clicked (isDone=true)', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: true }));
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });

    it('renders EcfDeploymentSection when hasAnyEcf is true', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: false }));
      renderStep();
      expect(screen.getByTestId('mock-ecf-launch-btn')).toBeInTheDocument();
    });

    it('does not render EcfDeploymentSection when hasAnyEcf is false', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: false }));
      renderStep();
      expect(screen.queryByTestId('mock-ecf-launch-btn')).not.toBeInTheDocument();
    });
  });

  describe('ECF + MI both present', () => {
    beforeEach(() => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty', 'cloudtrail'], dataFormat: 'json' },
        awsServicesMap: new Map([
          ['guardduty', miService],
          ['cloudtrail', ecfService],
        ]),
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: {
          serviceStatuses: {},
          policyIdsByInstance: {},
          onboardingDeploymentId: undefined,
        },
        updateDetectAndReviewStep: jest.fn(),
      });
    });

    it('Next remains disabled when MI deployed but ECF not launched', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: false }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('Next enables when both MI deployed and ECF launched', () => {
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: true }));
      renderStep();
      fireEvent.click(screen.getByTestId('mock-deploy-btn'));
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });
  });

  describe('mixed selection (MI + agent-based-only) — auto-switches all to agent-based', () => {
    // Julia's model: any agent-based-only service selected → lock everything to agent-based.
    const agentService: AwsServiceMatrixEntry = {
      id: 'awsfargate',
      name: 'AWS Fargate',
      category: 'compute',
      signalTypes: ['logs'],
      dataStreams: [],
      packageName: 'awsfargate',
      deploymentMethods: [{ method: 'agent_based', preferred: true }],
      defaultEnabled: true,
      defaultEnabledInputs: [],
      showInUI: true,
      isManifestLoaded: true,
      isManifestError: false,
      isStaticAgentBasedOnly: true,
    };

    beforeEach(() => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty', 'awsfargate'] },
        awsServicesMap: new Map([
          ['guardduty', miService],
          ['awsfargate', agentService],
        ]),
        deploymentMethod: 'agent_based',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
      });
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: false }));
    });

    it('auto-switches to agent_based when any agent-based-only service is selected', () => {
      const mockSetDeploymentMethod = jest.fn();
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty', 'awsfargate'] },
        awsServicesMap: new Map([
          ['guardduty', miService],
          ['awsfargate', agentService],
        ]),
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: mockSetDeploymentMethod,
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
      });
      renderStep();
      expect(mockSetDeploymentMethod).toHaveBeenCalledWith('agent_based');
    });

    it('renders DeploymentMethodCard locked', () => {
      renderStep();
      expect(MockDeploymentMethodCard).toHaveBeenCalledWith(
        expect.objectContaining({ locked: true }),
        expect.anything()
      );
    });

    it('does not render ManagedIntegrationsSection — all services go agent-based', () => {
      renderStep();
      expect(MockManagedIntegrationsSection).not.toHaveBeenCalled();
    });

    it('shows the agent-based callout', () => {
      renderStep();
      expect(
        screen.getByTestId('authenticateAndDeployStep-agentBasedOnlyCallout')
      ).toBeInTheDocument();
    });

    it('does not auto-switch when isMethodLocked (prior MI deployment exists)', () => {
      const mockSetDeploymentMethod = jest.fn();
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty', 'awsfargate'] },
        awsServicesMap: new Map([
          ['guardduty', miService],
          ['awsfargate', agentService],
        ]),
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: mockSetDeploymentMethod,
        detectAndReviewStep: {
          serviceStatuses: {},
          policyIdsByInstance: { guardduty: 'policy-123' },
        },
      });
      renderStep();
      expect(mockSetDeploymentMethod).not.toHaveBeenCalled();
    });
  });

  describe('agent-based-only services', () => {
    const agentService: AwsServiceMatrixEntry = {
      id: 'awsfargate',
      name: 'AWS Fargate',
      category: 'compute',
      signalTypes: ['logs'],
      dataStreams: [],
      packageName: 'awsfargate',
      deploymentMethods: [{ method: 'agent_based', preferred: true }],
      defaultEnabled: true,
      defaultEnabledInputs: [],
      showInUI: true,
      isManifestLoaded: true,
      isManifestError: false,
      isStaticAgentBasedOnly: true,
    };

    beforeEach(() => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['awsfargate'] },
        awsServicesMap: new Map([['awsfargate', agentService]]),
        deploymentMethod: 'agent_based',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
      });
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: false }));
    });

    it('auto-selects agent_based when current method is not agent_based', () => {
      const mockSetDeploymentMethod = jest.fn();
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['awsfargate'] },
        awsServicesMap: new Map([['awsfargate', agentService]]),
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: mockSetDeploymentMethod,
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
      });
      renderStep();
      expect(mockSetDeploymentMethod).toHaveBeenCalledWith('agent_based');
    });

    it('resets to managed_integration when the last agent-only service is deselected', () => {
      const mockSetDeploymentMethod = jest.fn();

      // First render: agent-only service selected, method starts as MI → auto-forced to agent_based.
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['awsfargate'] },
        awsServicesMap: new Map([
          ['awsfargate', agentService],
          ['guardduty', miService],
        ]),
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: mockSetDeploymentMethod,
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
      });
      const { rerender } = renderStep();
      expect(mockSetDeploymentMethod).toHaveBeenCalledWith('agent_based');
      mockSetDeploymentMethod.mockClear();

      // Second render: agent-only service removed, method now agent_based (was auto-forced).
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty'] },
        awsServicesMap: new Map([
          ['awsfargate', agentService],
          ['guardduty', miService],
        ]),
        deploymentMethod: 'agent_based',
        setDeploymentMethod: mockSetDeploymentMethod,
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
      });
      rerender(
        <I18nProvider>
          <AuthenticateAndDeployStep onContinue={jest.fn()} />
        </I18nProvider>
      );
      expect(mockSetDeploymentMethod).toHaveBeenCalledWith('managed_integration');
    });

    it('passes locked=true to DeploymentMethodCard', () => {
      renderStep();
      expect(MockDeploymentMethodCard).toHaveBeenCalledWith(
        expect.objectContaining({ locked: true }),
        expect.anything()
      );
    });

    it('shows the agent-based callout', () => {
      renderStep();
      expect(
        screen.getByTestId('authenticateAndDeployStep-agentBasedOnlyCallout')
      ).toBeInTheDocument();
    });

    it('does not render ManagedIntegrationsSection', () => {
      renderStep();
      expect(MockManagedIntegrationsSection).not.toHaveBeenCalled();
    });

    it('Next is enabled without any deployment action', () => {
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });
  });

  describe('ECF-only SO reuse on Back→Next', () => {
    it('reuses existing deploymentId and does not call createDeployment when SO already exists', async () => {
      // Simulates: user clicked Next (SO created, id persisted), navigated Back, clicked Next again.
      const mockCreate = jest.fn().mockResolvedValue('new-dep-id');
      const mockUpdate = jest.fn().mockResolvedValue(true);
      const mockPersist = jest.fn();
      mockUseOnboardingSO.mockReturnValue({
        createDeployment: mockCreate,
        updateDeployment: mockUpdate,
        persistDeploymentId: mockPersist,
      });

      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['cloudtrail'] },
        awsServicesMap: new Map([['cloudtrail', ecfService]]),
        detectAndReviewStep: { onboardingDeploymentId: 'existing-dep-id' },
        updateDetectAndReviewStep: jest.fn(),
      });
      mockUseEcfDeployment.mockReturnValue(makeEcfReturn({ hasAnyEcf: true, isDone: true }));

      const onContinue = jest.fn();
      renderStep(onContinue);
      fireEvent.click(screen.getByTestId('authenticateAndDeployStep-nextButton'));

      // SO already exists — must not create a second one.
      await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
      expect(mockCreate).not.toHaveBeenCalled();
      // Must update the existing SO with the latest ecfStacks.
      expect(mockUpdate).toHaveBeenCalledWith(
        'existing-dep-id',
        expect.objectContaining({ status: 'succeeded' })
      );
      // persistDeploymentId must not fire again (URL/context already set).
      expect(mockPersist).not.toHaveBeenCalled();
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });

  // Regression: isMethodLocked only checked policyIdsByInstance; removeDeployInstance moves IDs
  // into pendingCleanupPolicyIds, so after the last instance is removed the lock would lift while
  // orphaned policies still awaited cleanup. The user could then switch to agent-based, causing
  // hasStaleMiPolicies to be gated out (!isAgentBased) and old MI policies to be left behind.
  describe('deployment method lock', () => {
    function getMockDeploymentMethodCard(): jest.Mock {
      return jest.requireMock('./authenticate_and_deploy_step/deployment_method_card')
        .DeploymentMethodCard;
    }

    it('remains locked when policyIdsByInstance is empty but pendingCleanupPolicyIds is not', () => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty'], dataFormat: 'json' },
        awsServicesMap: awsServicesMapWithMI,
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: {
          serviceStatuses: {},
          policyIdsByInstance: {},
          pendingCleanupPolicyIds: { 'inst-a': 'policy-123' },
          onboardingDeploymentId: undefined,
        },
        updateDetectAndReviewStep: jest.fn(),
      });

      renderStep();

      const mock = getMockDeploymentMethodCard();
      const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
      expect(lastCall[0].disabled).toBe(true);
    });

    it('is unlocked when both policyIdsByInstance and pendingCleanupPolicyIds are empty', () => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['guardduty'], dataFormat: 'json' },
        awsServicesMap: awsServicesMapWithMI,
        deploymentMethod: 'managed_integration',
        setDeploymentMethod: jest.fn(),
        detectAndReviewStep: {
          serviceStatuses: {},
          policyIdsByInstance: {},
          pendingCleanupPolicyIds: {},
          onboardingDeploymentId: undefined,
        },
        updateDetectAndReviewStep: jest.fn(),
      });

      renderStep();

      const mock = getMockDeploymentMethodCard();
      const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
      expect(lastCall[0].disabled).toBe(false);
    });
  });

  describe('AWS identity federation feature flag', () => {
    const miServiceWithoutFederation = { ...miService, identityFederationSupported: false };

    it('offers identity federation when the flag is ON and the service supports it', () => {
      mockUseAwsIdentityFederationEnabled.mockReturnValue(true);
      renderStep();
      expect(getLastMiSectionProps().showIdentityFederation).toBe(true);
    });

    it('hides identity federation when the flag is OFF even if the service supports it', () => {
      mockUseAwsIdentityFederationEnabled.mockReturnValue(false);
      renderStep();
      expect(getLastMiSectionProps().showIdentityFederation).toBe(false);
    });

    it('hides identity federation when the flag is ON but the service does not support it', () => {
      mockUseAwsIdentityFederationEnabled.mockReturnValue(true);
      mockUseOnboardingFlow.mockReturnValue({
        ...mockUseOnboardingFlow(),
        awsServicesMap: new Map([['guardduty', miServiceWithoutFederation]]),
      });
      renderStep();
      expect(getLastMiSectionProps().showIdentityFederation).toBe(false);
    });
  });

  describe('manifest loading/error gating', () => {
    it('disables and shows loading on Next while a selected service manifest is still loading', () => {
      mockUseOnboardingFlow.mockReturnValue({
        ...mockUseOnboardingFlow(),
        awsServicesMap: new Map([
          ['guardduty', { ...miService, isManifestLoaded: false, isManifestError: false }],
        ]),
      });
      renderStep();
      const next = screen.getByTestId('authenticateAndDeployStep-nextButton');
      expect(next).toBeDisabled();
      // EuiButton renders a loading spinner (role=progressbar) when isLoading=true
      expect(next.querySelector('[role="progressbar"]')).not.toBeNull();
    });

    it('disables Next and shows error callout when a selected service manifest fails to load', () => {
      mockUseOnboardingFlow.mockReturnValue({
        ...mockUseOnboardingFlow(),
        awsServicesMap: new Map([
          ['guardduty', { ...miService, isManifestLoaded: false, isManifestError: true }],
        ]),
      });
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
      expect(
        screen.getByTestId('authenticateAndDeployStep-manifestErrorCallout')
      ).toBeInTheDocument();
    });

    it('calls refetchAwsServiceMatrix when the manifest retry button is clicked', () => {
      const mockRefetch = jest.fn();
      mockUseOnboardingFlow.mockReturnValue({
        ...mockUseOnboardingFlow(),
        refetchAwsServiceMatrix: mockRefetch,
        awsServicesMap: new Map([
          ['guardduty', { ...miService, isManifestLoaded: false, isManifestError: true }],
        ]),
      });
      renderStep();
      fireEvent.click(screen.getByTestId('authenticateAndDeployStep-manifestRetryButton'));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
  describe('settings changed callout — switching an ECF service to agent-based', () => {
    const def = (name: string) => ({
      name,
      type: 'text',
      required: true,
      show_user: true,
    });
    // Agent-based view of an ECF-capable service: full manifest vars, `ecfSettings` retained.
    const ecfCapableService: AwsServiceMatrixEntry = {
      ...ecfService,
      dataStreams: ['cloudtrail'],
      inputs: ['aws-s3'],
      requiredConfig: ['bucket_arn', 'queue_url'],
      varDefsByInput: {
        'aws-s3': { bucket_arn: def('bucket_arn'), queue_url: def('queue_url') } as any,
      },
      ecfSettings: {
        requiredConfig: ['bucket_arn'],
        dataStreams: ['cloudtrail'],
        inputs: ['aws-s3'],
        defaultEnabledInputs: [],
      },
    };

    const arrange = ({
      queueUrl,
      settingsMethod,
      service = ecfCapableService,
    }: {
      queueUrl?: string;
      settingsMethod?: 'agent_based' | 'managed_integration';
      service?: AwsServiceMatrixEntry;
    }) => {
      mockUseOnboardingFlow.mockReturnValue({
        servicesStep: { selectedServiceIds: ['cloudtrail'], dataFormat: 'ecs' },
        awsServicesMap: new Map([['cloudtrail', service]]),
        deploymentMethod: 'agent_based',
        setDeploymentMethod: jest.fn(),
        serviceSettingsMethod: settingsMethod,
        detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
        updateDetectAndReviewStep: jest.fn(),
        refetchAwsServiceMatrix: jest.fn(),
      });
      mockUseSessionStorage.mockReturnValue([
        {
          globalRegion: 'us-east-1',
          instances: [
            { instanceId: 'cloudtrail', serviceId: 'cloudtrail', name: 'x', isDuplicate: false },
          ],
          serviceVars: {
            cloudtrail: {
              enabledDataStreams: ['cloudtrail'],
              varsByDataStream: {
                cloudtrail: {
                  enabledInputs: ['aws-s3'],
                  varsByInput: {
                    'aws-s3': { bucket_arn: 'arn:aws:s3:::b', queue_url: queueUrl ?? '' },
                  },
                },
              },
            },
          },
        },
        jest.fn(),
      ]);
    };

    it('shows the callout and blocks Next while required agent-based settings are missing', () => {
      arrange({ settingsMethod: 'managed_integration' });
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-settingsChangedCallout')).toBeVisible();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).toBeDisabled();
    });

    it('navigates back to Step 2 from the callout', () => {
      arrange({ settingsMethod: 'managed_integration' });
      const onBack = jest.fn();
      renderStep(jest.fn(), onBack);
      fireEvent.click(screen.getByTestId('authenticateAndDeployStep-settingsChangedBackButton'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('still shows an advisory callout, without blocking Next, when settings are complete', () => {
      arrange({ settingsMethod: 'managed_integration', queueUrl: 'https://sqs/queue' });
      renderStep();
      expect(screen.getByTestId('authenticateAndDeployStep-settingsChangedCallout')).toBeVisible();
      expect(screen.getByTestId('authenticateAndDeployStep-nextButton')).not.toBeDisabled();
    });

    it('hides the callout once Step 2 was continued under agent-based and is complete', () => {
      arrange({ settingsMethod: 'agent_based', queueUrl: 'https://sqs/queue' });
      renderStep();
      expect(
        screen.queryByTestId('authenticateAndDeployStep-settingsChangedCallout')
      ).not.toBeInTheDocument();
    });

    it('does not show the callout for ecfOnly services (OTel twins keep the ECF view)', () => {
      arrange({
        settingsMethod: 'managed_integration',
        service: { ...ecfCapableService, ecfOnly: true },
      });
      renderStep();
      expect(
        screen.queryByTestId('authenticateAndDeployStep-settingsChangedCallout')
      ).not.toBeInTheDocument();
    });
  });
});
