/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { AwsStaticKeyCredentials } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry, DataFormat, DeploymentMethod } from './aws_service_matrix';
import { useAwsServiceMatrix } from './use_aws_service_matrix';
import { useDefaultDataFormat } from './use_default_data_format';
import { getOnboardingSessionKey } from './onboarding_session_storage';

/** Method used when nothing is persisted. Read and compared against in exactly one place each. */
const DEFAULT_DEPLOYMENT_METHOD: DeploymentMethod = 'managed_integration';

export interface AuthenticateAndDeployStepState {
  connectorId?: string;
  connectorName?: string;
  staticKeys?: AwsStaticKeyCredentials;
}

export type ServiceChipState = 'instantiating' | 'detecting' | 'receiving' | 'error' | 'timeout';

export interface DetectAndReviewStepState {
  isDeploying: boolean;
  serviceStatuses: Record<string, ServiceChipState>;
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  deployErrors: Record<string, string>;
}

// Only non-sensitive fields are persisted — password values are never written to session storage.
// secret_access_key and session_token (agent-based) live in memory only and are never persisted.
interface PersistedAuthenticateAndDeployStep {
  connectorId?: string;
  connectorName?: string;
  authType?: 'identity_federation' | 'static_keys';
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
}

interface OnboardingFlowState {
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  setConnectorId: (id: string | undefined, name?: string) => void;
  setStaticKeys: (keys: AwsStaticKeyCredentials | undefined) => void;
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
    persistedAuthenticateAndDeployStep?.authType === 'static_keys' &&
    persistedAuthenticateAndDeployStep.accessKeyId
      ? { access_key_id: persistedAuthenticateAndDeployStep.accessKeyId, secret_access_key: '' }
      : undefined
  );

  // Ref holds the latest persisted value so setConnectorId/setStaticKeys can spread it
  // without closing over the state value — keeping both callbacks stable across renders.
  const persistedAuthStepRef = useRef(persistedAuthenticateAndDeployStep);
  persistedAuthStepRef.current = persistedAuthenticateAndDeployStep;

  const setConnectorId = useCallback(
    (id: string | undefined, name?: string) => {
      setStaticKeysState(undefined);
      setPersistedAuthenticateAndDeployStep({
        ...persistedAuthStepRef.current,
        connectorId: id,
        connectorName: id ? name : undefined,
        authType: id ? 'identity_federation' : undefined,
        accessKeyId: undefined,
      });
    },
    [setPersistedAuthenticateAndDeployStep]
  );

  const setStaticKeys = useCallback(
    (keys: AwsStaticKeyCredentials | undefined) => {
      setStaticKeysState(keys);
      setPersistedAuthenticateAndDeployStep({
        ...persistedAuthStepRef.current,
        connectorId: undefined,
        connectorName: undefined,
        authType: keys ? 'static_keys' : undefined,
        accessKeyId: keys?.access_key_id,
      });
    },
    [setPersistedAuthenticateAndDeployStep]
  );

  // Single write using persistedAuthStepRef.current — prevents stale-closure races when two
  // callers update the same ref within the same event-loop tick. Same pattern as setDataFormat.
  const setAgentBasedDeployment = useCallback(
    (update: Partial<AgentBasedDeploymentState>) => {
      setPersistedAuthenticateAndDeployStep({
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
      });
    },
    [setPersistedAuthenticateAndDeployStep]
  );

  const setSelectedServiceIds = useCallback(
    (ids: string[]) => {
      setPersistedServices({ ...persistedServices, selectedServiceIds: ids });
    },
    [persistedServices, setPersistedServices]
  );

  const setDataFormat = useCallback(
    (format: DataFormat) => {
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
      setPersistedAuthenticateAndDeployStep({
        ...prev,
        deploymentMethod: method,
        agentPolicyId: undefined,
        agentPolicyName: undefined,
      });
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
