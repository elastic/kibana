/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type {
  AwsStaticKeyCredentials,
  CloudOnboardingDeploymentAuthMethod,
  IacRenderedTemplate,
} from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry, DataFormat, DeploymentMethod } from './aws_service_matrix';
import { useAwsServiceMatrix } from './use_aws_service_matrix';
import { useDefaultDataFormat } from './use_default_data_format';
import { getOnboardingSessionKey } from './onboarding_session_storage';

/** Method used when nothing is persisted. Read and compared against in exactly one place each. */
const DEFAULT_DEPLOYMENT_METHOD: DeploymentMethod = 'managed_integration';

/**
 * Template details of the CloudFormation template the user launched for an existing Federated Identity
 * during this step, waiting to be written to the connector once Deploy succeeds. Memory only: it
 * describes a launch in this session, and a reload re-runs the check anyway.
 */
export interface PendingIacTemplate extends IacRenderedTemplate {
  /** The identity the template was rendered for; the write is skipped if the selection changed. */
  connectorId: string;
  /**
   * JSON of the integration set (as built by buildIacIntegrations, which sorts, so equal sets give
   * equal strings) the template was rendered for; Deploy writes the details only when the set it
   * deploys is the same.
   */
  integrationsKey: string;
}

export interface AuthenticateAndDeployStepState {
  connectorId?: string;
  connectorName?: string;
  staticKeys?: AwsStaticKeyCredentials;
  authMethod?: CloudOnboardingDeploymentAuthMethod;
  pendingIacTemplate?: PendingIacTemplate;
}

export type ServiceChipState = 'instantiating' | 'detecting' | 'receiving' | 'error' | 'timeout';

export interface DetectAndReviewStepState {
  isDeploying: boolean;
  serviceStatuses: Record<string, ServiceChipState>;
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  deployErrors: Record<string, string>;
  /** SO id of the cloud-onboarding-deployment record created at Deploy time. Used to update the record after allSettled and on retry. */
  onboardingDeploymentId?: string;
  /** ECF stacks last written to the SO. Used to skip redundant PUT calls on Back→Next. */
  ecfStacks?: Array<{ family: string; stackName: string; templateVersion: string }>;
}

// Only non-sensitive fields are persisted — password values are never written to session storage.
// secret_access_key and session_token (agent-based) live in memory only and are never persisted.
interface PersistedAuthenticateAndDeployStep {
  connectorId?: string;
  connectorName?: string;
  authMethod?: CloudOnboardingDeploymentAuthMethod;
  accessKeyId?: string;
  deploymentMethod?: DeploymentMethod;
  // Agent-based deploy fields — persisted so Back/Next round trips preserve state.
  // Note: agentPolicyId presence doubles as the durable "deploy succeeded" flag (no separate bool).
  agentHostsMode?: 'new' | 'existing';
  agentPolicyId?: string; // set after new-policy deploy; used as double-creation guard on retry
  agentPolicyName?: string; // denormalised so step 4 needs no GET
  selectedAgentPolicyIds?: string[]; // for existing-policy mode
  // Agent-based credential method — persisted so switching steps preserves the selection.
  agentCredentialMethod?:
    | 'direct_access_keys'
    | 'temporary_keys'
    | 'shared_credentials'
    | 'assume_role';
  // Non-secret credential fields for shared_credentials and assume_role methods.
  // secret_access_key / session_token are never persisted (memory only).
  sharedCredentialFile?: string;
  credentialProfileName?: string;
  roleArn?: string;
  withSysMonitoring?: boolean;
}

export interface ServicesStepState {
  selectedServiceIds: string[];
  dataFormat: DataFormat;
}

interface PersistedServicesStep {
  selectedServiceIds: string[];
  /** Undefined when not yet explicitly chosen; resolved against the solution default at read time. */
  dataFormat?: DataFormat;
}

interface PersistedDetectAndReviewStep {
  serviceStatuses: Record<string, ServiceChipState>;
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  deployErrors: Record<string, string>;
  onboardingDeploymentId?: string;
  ecfStacks?: Array<{ family: string; stackName: string; templateVersion: string }>;
}

const DEFAULT_SELECTED_IDS: string[] = [];

export interface AgentBasedDeploymentState {
  agentHostsMode: 'new' | 'existing';
  agentPolicyId?: string;
  agentPolicyName?: string;
  selectedAgentPolicyIds: string[];
  agentCredentialMethod:
    | 'direct_access_keys'
    | 'temporary_keys'
    | 'shared_credentials'
    | 'assume_role';
  sharedCredentialFile?: string;
  credentialProfileName?: string;
  roleArn?: string;
  withSysMonitoring?: boolean;
}

interface OnboardingFlowState {
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  setConnectorId: (id: string | undefined, name?: string) => void;
  setStaticKeys: (keys: AwsStaticKeyCredentials | undefined) => void;
  setPendingIacTemplate: (iac: PendingIacTemplate | undefined) => void;
  setAgentBasedDeployment: (state: Partial<AgentBasedDeploymentState>) => void;
  agentBasedDeployment: AgentBasedDeploymentState;
  deploymentMethod: DeploymentMethod;
  setDeploymentMethod: (method: DeploymentMethod) => void;
  servicesStep: ServicesStepState;
  setSelectedServiceIds: (ids: string[]) => void;
  setDataFormat: (format: DataFormat) => void;
  detectAndReviewStep: DetectAndReviewStepState;
  updateDetectAndReviewStep: (update: Partial<DetectAndReviewStepState>) => void;
  removeDeployInstance: (instanceId: string) => void;
  getLatestFailedInstances: () => string[];
  awsServiceMatrix: AwsServiceMatrixEntry[] | undefined;
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined;
  awsServiceMatrixError: boolean;
  refetchAwsServiceMatrix: () => void;
  /** False while the default data format is being resolved (async spaces lookup). */
  isDataFormatResolved: boolean;
}

const OnboardingFlowContext = createContext<OnboardingFlowState | undefined>(undefined);

export function OnboardingFlowProvider({ children }: { children: React.ReactNode }) {
  const [persistedAuthenticateAndDeployStep, setPersistedAuthenticateAndDeployStep] =
    useSessionStorage<PersistedAuthenticateAndDeployStep>(
      // Key hardcoded to 'aws'; threading integrationId through the provider is deferred to #8099
      getOnboardingSessionKey('aws', 'authenticateAndDeployStep'),
      {}
    );

  const [persistedServices, setPersistedServices] = useSessionStorage<PersistedServicesStep>(
    getOnboardingSessionKey('aws', 'servicesStep'),
    { selectedServiceIds: DEFAULT_SELECTED_IDS }
  );

  // secret_access_key lives in memory only; access_key_id is restored from session storage.
  const [staticKeys, setStaticKeysState] = useState<AwsStaticKeyCredentials | undefined>(() =>
    persistedAuthenticateAndDeployStep?.authMethod === 'static_keys' &&
    persistedAuthenticateAndDeployStep.accessKeyId
      ? { access_key_id: persistedAuthenticateAndDeployStep.accessKeyId, secret_access_key: '' }
      : undefined
  );

  // Not persisted: see PendingIacTemplate.
  const [pendingIacTemplate, setPendingIacTemplate] = useState<PendingIacTemplate | undefined>(
    undefined
  );

  // Ref holds the latest persisted value so all writers of persistedAuthenticateAndDeployStep
  // can spread it without closing over the state value, and each writer advances the ref
  // synchronously before calling the setter so back-to-back calls in the same event-loop
  // tick each see the accumulated state rather than a stale pre-render snapshot.
  const persistedAuthStepRef = useRef(persistedAuthenticateAndDeployStep);
  persistedAuthStepRef.current = persistedAuthenticateAndDeployStep;

  const setConnectorId = useCallback(
    (id: string | undefined, name?: string) => {
      setStaticKeysState(undefined);
      // A rendered template belongs to the identity it was rendered for. The Fleet component
      // re-emits the same id on every readiness change, so only a real change drops it.
      if (persistedAuthStepRef.current?.connectorId !== id) {
        setPendingIacTemplate(undefined);
      }
      const next = {
        ...persistedAuthStepRef.current,
        connectorId: id,
        connectorName: id ? name : undefined,
        authMethod: id ? ('identity_federation' as const) : undefined,
        accessKeyId: undefined,
      };
      persistedAuthStepRef.current = next;
      setPersistedAuthenticateAndDeployStep(next);
    },
    [setPersistedAuthenticateAndDeployStep]
  );

  const setStaticKeys = useCallback(
    (keys: AwsStaticKeyCredentials | undefined) => {
      setStaticKeysState(keys);
      // Static keys replace the identity, so a template rendered for it has no connector to land on.
      setPendingIacTemplate(undefined);
      const next = {
        ...persistedAuthStepRef.current,
        connectorId: undefined,
        connectorName: undefined,
        authMethod: keys ? ('static_keys' as const) : undefined,
        accessKeyId: keys?.access_key_id,
      };
      persistedAuthStepRef.current = next;
      setPersistedAuthenticateAndDeployStep(next);
    },
    [setPersistedAuthenticateAndDeployStep]
  );

  const setAgentBasedDeployment = useCallback(
    (update: Partial<AgentBasedDeploymentState>) => {
      const next = {
        ...persistedAuthStepRef.current,
        ...(update.agentHostsMode !== undefined ? { agentHostsMode: update.agentHostsMode } : {}),
        ...(update.agentPolicyId !== undefined ? { agentPolicyId: update.agentPolicyId } : {}),
        ...(update.agentPolicyName !== undefined
          ? { agentPolicyName: update.agentPolicyName }
          : {}),
        ...(update.selectedAgentPolicyIds !== undefined
          ? { selectedAgentPolicyIds: update.selectedAgentPolicyIds }
          : {}),
        ...(update.agentCredentialMethod !== undefined
          ? { agentCredentialMethod: update.agentCredentialMethod }
          : {}),
        ...(update.sharedCredentialFile !== undefined
          ? { sharedCredentialFile: update.sharedCredentialFile }
          : {}),
        ...(update.credentialProfileName !== undefined
          ? { credentialProfileName: update.credentialProfileName }
          : {}),
        ...(update.roleArn !== undefined ? { roleArn: update.roleArn } : {}),
        ...(update.withSysMonitoring !== undefined
          ? { withSysMonitoring: update.withSysMonitoring }
          : {}),
      };
      // Sync the ref so back-to-back calls in the same event-loop tick each see
      // the accumulated state rather than spreading a stale pre-render snapshot.
      persistedAuthStepRef.current = next;
      setPersistedAuthenticateAndDeployStep(next);
    },
    [setPersistedAuthenticateAndDeployStep]
  );

  // Rendered-template details is only valid for the service set it was rendered for: a
  // template launched for set A must not be recorded as the stack's digest after the user goes
  // back and deploys set B. Any change to the selection drops it; the check re-renders anyway.
  const setSelectedServiceIds = useCallback(
    (ids: string[]) => {
      setPendingIacTemplate(undefined);
      setPersistedServices({ ...persistedServices, selectedServiceIds: ids });
    },
    [persistedServices, setPersistedServices]
  );

  const setDataFormat = useCallback(
    (format: DataFormat) => {
      // A format change empties the selection (see above): the template details goes with it.
      setPendingIacTemplate(undefined);
      // Clear selection atomically with the format change in one write — two separate
      // setPersistedServices calls would race because each closes over the same persistedServices.
      setPersistedServices({ ...persistedServices, dataFormat: format, selectedServiceIds: [] });
    },
    [persistedServices, setPersistedServices]
  );

  const [persistedDetectAndReviewStep, setPersistedDetectAndReviewStep] =
    useSessionStorage<PersistedDetectAndReviewStep>(
      getOnboardingSessionKey('aws', 'detectAndReviewStep'),
      {
        serviceStatuses: {},
        policyIdsByInstance: {},
        failedInstances: [],
        deployErrors: {},
      }
    );

  // isDeploying is intentionally not persisted — it resets to false on page reload
  const [isDeploying, setIsDeploying] = useState(false);

  // Ref always holds the latest persisted value so updateDetectAndReviewStep
  // reads current state even when called after an await (stale closure prevention).
  const persistedDetectAndReviewStepRef = useRef(persistedDetectAndReviewStep);
  persistedDetectAndReviewStepRef.current = persistedDetectAndReviewStep;

  const updateDetectAndReviewStep = useCallback(
    (update: Partial<DetectAndReviewStepState>) => {
      if (update.isDeploying !== undefined) {
        setIsDeploying(update.isDeploying);
      }
      const { isDeploying: _, ...rest } = update;
      if (Object.keys(rest).length > 0) {
        const prev = persistedDetectAndReviewStepRef.current;
        setPersistedDetectAndReviewStep({
          serviceStatuses: { ...(prev?.serviceStatuses ?? {}), ...(rest.serviceStatuses ?? {}) },
          policyIdsByInstance: {
            ...(prev?.policyIdsByInstance ?? {}),
            ...(rest.policyIdsByInstance ?? {}),
          },
          failedInstances: rest.failedInstances ?? prev?.failedInstances ?? [],
          deployErrors:
            rest.deployErrors !== undefined ? rest.deployErrors : prev?.deployErrors ?? {},
          onboardingDeploymentId: rest.onboardingDeploymentId ?? prev?.onboardingDeploymentId,
          ecfStacks: rest.ecfStacks ?? prev?.ecfStacks,
        });
      }
    },
    [setPersistedDetectAndReviewStep]
  );

  const removeDeployInstance = useCallback(
    (instanceId: string) => {
      const prev = persistedDetectAndReviewStepRef.current;
      const nextStatuses = { ...(prev?.serviceStatuses ?? {}) };
      delete nextStatuses[instanceId];
      const nextPolicyIds = { ...(prev?.policyIdsByInstance ?? {}) };
      delete nextPolicyIds[instanceId];
      setPersistedDetectAndReviewStep({
        serviceStatuses: nextStatuses,
        policyIdsByInstance: nextPolicyIds,
        failedInstances: (prev?.failedInstances ?? []).filter((id) => id !== instanceId),
        deployErrors: Object.fromEntries(
          Object.entries(prev?.deployErrors ?? {}).filter(([id]) => id !== instanceId)
        ),
        onboardingDeploymentId: prev?.onboardingDeploymentId,
        ecfStacks: prev?.ecfStacks,
      });
    },
    [setPersistedDetectAndReviewStep]
  );

  const getLatestFailedInstances = useCallback(
    () => persistedDetectAndReviewStepRef.current?.failedInstances ?? [],
    []
  );

  const {
    matrix: awsServiceMatrix,
    isError: awsServiceMatrixError,
    refetch: refetchAwsServiceMatrix,
  } = useAwsServiceMatrix();
  const awsServicesMap = useMemo(
    () => (awsServiceMatrix ? new Map(awsServiceMatrix.map((s) => [s.id, s])) : undefined),
    [awsServiceMatrix]
  );

  const { defaultFormat, isResolved: isDataFormatResolved } = useDefaultDataFormat();
  const dataFormat: DataFormat = persistedServices?.dataFormat ?? defaultFormat;

  const selectedServiceIds = useMemo(
    () =>
      (persistedServices?.selectedServiceIds ?? DEFAULT_SELECTED_IDS).filter((id) => {
        const entry = awsServicesMap?.get(id);
        // Keep all ids while awsServicesMap is loading — useInvalidateDownstreamSteps runs before
        // the !awsServiceMatrix spinner gate (onboarding_shell.tsx:80 vs :191), so dropping ids
        // during the load window would change the sorted signature and wrongly mark downstream
        // steps incomplete on every reload.
        if (!entry) return true;
        return entry.showInUI !== false && (entry.dataFormat ?? 'ecs') === dataFormat;
      }),
    [persistedServices, awsServicesMap, dataFormat]
  );

  const servicesStep: ServicesStepState = useMemo(
    () => ({ selectedServiceIds, dataFormat }),
    [selectedServiceIds, dataFormat]
  );

  const deploymentMethod: DeploymentMethod =
    persistedAuthenticateAndDeployStep?.deploymentMethod ?? DEFAULT_DEPLOYMENT_METHOD;

  const setDeploymentMethod = useCallback(
    (method: DeploymentMethod) => {
      const prev = persistedAuthStepRef.current;
      // Compare against the same default the context exposes. An unset persisted field still
      // reads as 'managed_integration' everywhere else, so comparing the raw undefined would
      // treat the first select of the default method as a change and wipe an in-progress deploy.
      const current = prev?.deploymentMethod ?? DEFAULT_DEPLOYMENT_METHOD;
      if (current === method) return;

      // Switching method invalidates every artifact of the previous one: an agent policy is
      // meaningless to the agentless path and a cloud connector is meaningless to the agent-based
      // path. Without this reset, failures from the abandoned method keep the "Deployment failed"
      // callout up and gate Next on a deploy the user is no longer attempting.
      const next = {
        ...prev,
        deploymentMethod: method,
        agentPolicyId: undefined,
        agentPolicyName: undefined,
        withSysMonitoring: undefined,
      };
      persistedAuthStepRef.current = next;
      setPersistedAuthenticateAndDeployStep(next);
      setPersistedDetectAndReviewStep({
        serviceStatuses: {},
        policyIdsByInstance: {},
        failedInstances: [],
        deployErrors: {},
      });
    },
    [setPersistedAuthenticateAndDeployStep, setPersistedDetectAndReviewStep]
  );

  const authenticateAndDeployStep: AuthenticateAndDeployStepState = {
    connectorId: persistedAuthenticateAndDeployStep?.connectorId,
    connectorName: persistedAuthenticateAndDeployStep?.connectorName,
    staticKeys,
    authMethod: persistedAuthenticateAndDeployStep?.authMethod,
    pendingIacTemplate,
  };

  const agentBasedDeployment: AgentBasedDeploymentState = {
    agentHostsMode: persistedAuthenticateAndDeployStep?.agentHostsMode ?? 'new',
    agentPolicyId: persistedAuthenticateAndDeployStep?.agentPolicyId,
    agentPolicyName: persistedAuthenticateAndDeployStep?.agentPolicyName,
    selectedAgentPolicyIds:
      persistedAuthenticateAndDeployStep?.selectedAgentPolicyIds ?? ([] as string[]),
    agentCredentialMethod:
      persistedAuthenticateAndDeployStep?.agentCredentialMethod ?? 'direct_access_keys',
    sharedCredentialFile: persistedAuthenticateAndDeployStep?.sharedCredentialFile,
    credentialProfileName: persistedAuthenticateAndDeployStep?.credentialProfileName,
    roleArn: persistedAuthenticateAndDeployStep?.roleArn,
    withSysMonitoring: persistedAuthenticateAndDeployStep?.withSysMonitoring,
  };

  const detectAndReviewStep: DetectAndReviewStepState = {
    isDeploying,
    ...persistedDetectAndReviewStep,
  };

  return (
    <OnboardingFlowContext.Provider
      value={{
        authenticateAndDeployStep,
        setConnectorId,
        setStaticKeys,
        setPendingIacTemplate,
        setAgentBasedDeployment,
        agentBasedDeployment,
        deploymentMethod,
        setDeploymentMethod,
        servicesStep,
        setSelectedServiceIds,
        setDataFormat,
        detectAndReviewStep,
        updateDetectAndReviewStep,
        removeDeployInstance,
        getLatestFailedInstances,
        awsServiceMatrix,
        awsServicesMap,
        awsServiceMatrixError,
        refetchAwsServiceMatrix,
        isDataFormatResolved,
      }}
    >
      {children}
    </OnboardingFlowContext.Provider>
  );
}

export function useOnboardingFlow(): OnboardingFlowState {
  const ctx = useContext(OnboardingFlowContext);
  if (!ctx) {
    throw new Error('useOnboardingFlow must be used within OnboardingFlowProvider');
  }
  return ctx;
}
