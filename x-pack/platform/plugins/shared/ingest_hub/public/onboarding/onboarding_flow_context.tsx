/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { AwsStaticKeyCredentials } from '@kbn/fleet-plugin/public';

import type { AwsServiceMatrixEntry } from './aws_service_matrix';
import { useAwsServiceMatrix } from './use_aws_service_matrix';
import { getOnboardingSessionKey } from './onboarding_session_storage';

export interface AuthenticateAndDeployStepState {
  connectorId?: string;
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

// Only non-sensitive fields are persisted — password values are never written to session storage
interface PersistedAuthenticateAndDeployStep {
  connectorId?: string;
  authType?: 'identity_federation' | 'static_keys';
  accessKeyId?: string;
}

export interface ServicesStepState {
  selectedServiceIds: string[];
}

interface PersistedServicesStep {
  selectedServiceIds: string[];
}

interface PersistedDetectAndReviewStep {
  serviceStatuses: Record<string, ServiceChipState>;
  policyIdsByInstance: Record<string, string>;
  failedInstances: string[];
  deployErrors: Record<string, string>;
}

const DEFAULT_SELECTED_IDS: string[] = [];

interface OnboardingFlowState {
  authenticateAndDeployStep: AuthenticateAndDeployStepState;
  setConnectorId: (id: string | undefined) => void;
  setStaticKeys: (keys: AwsStaticKeyCredentials | undefined) => void;
  servicesStep: ServicesStepState;
  setSelectedServiceIds: (ids: string[]) => void;
  detectAndReviewStep: DetectAndReviewStepState;
  updateDetectAndReviewStep: (update: Partial<DetectAndReviewStepState>) => void;
  removeDeployInstance: (instanceId: string) => void;
  getLatestFailedInstances: () => string[];
  registerDeployHandler: (fn: (instanceIds?: string[]) => void) => void;
  awsServiceMatrix: AwsServiceMatrixEntry[] | undefined;
  awsServicesMap: Map<string, AwsServiceMatrixEntry> | undefined;
  awsServiceMatrixError: boolean;
  refetchAwsServiceMatrix: () => void;
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

  const setConnectorId = useCallback(
    (id: string | undefined) => {
      setStaticKeysState(undefined);
      setPersistedAuthenticateAndDeployStep({
        connectorId: id,
        authType: id ? 'identity_federation' : undefined,
      });
    },
    [setPersistedAuthenticateAndDeployStep]
  );

  const setStaticKeys = useCallback(
    (keys: AwsStaticKeyCredentials | undefined) => {
      setStaticKeysState(keys);
      setPersistedAuthenticateAndDeployStep({
        authType: keys ? 'static_keys' : undefined,
        accessKeyId: keys?.access_key_id,
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

  // Note: session key deliberately kept as 'deployAndDetectStep' — no migration needed
  // (sessionStorage, one tab, dies on close, behind off-by-default feature flag).
  const [persistedDetectAndReviewStep, setPersistedDetectAndReviewStep] =
    useSessionStorage<PersistedDetectAndReviewStep>(
      getOnboardingSessionKey('aws', 'deployAndDetectStep'),
      {
        serviceStatuses: {},
        policyIdsByInstance: {},
        failedInstances: [],
        deployErrors: {},
      }
    );

  // isDeploying is intentionally not persisted — it resets to false on page reload
  const [isDeploying, setIsDeploying] = useState(false);

  const deployHandlerRef = useRef<((instanceIds?: string[]) => void) | null>(null);

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

  const registerDeployHandler = useCallback((fn: (instanceIds?: string[]) => void) => {
    deployHandlerRef.current = fn;
  }, []);

  const {
    matrix: awsServiceMatrix,
    isError: awsServiceMatrixError,
    refetch: refetchAwsServiceMatrix,
  } = useAwsServiceMatrix();
  const awsServicesMap = useMemo(
    () => (awsServiceMatrix ? new Map(awsServiceMatrix.map((s) => [s.id, s])) : undefined),
    [awsServiceMatrix]
  );

  const selectedServiceIds = useMemo(
    () =>
      (persistedServices?.selectedServiceIds ?? DEFAULT_SELECTED_IDS).filter(
        // When awsServicesMap is still loading, keep all persisted ids; filter once ready.
        (id) => awsServicesMap?.get(id)?.showInUI !== false
      ),
    [persistedServices, awsServicesMap]
  );

  const servicesStep: ServicesStepState = useMemo(
    () => ({ selectedServiceIds }),
    [selectedServiceIds]
  );

  const authenticateAndDeployStep: AuthenticateAndDeployStepState = {
    connectorId: persistedAuthenticateAndDeployStep?.connectorId,
    staticKeys,
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
        servicesStep,
        setSelectedServiceIds,
        detectAndReviewStep,
        updateDetectAndReviewStep,
        removeDeployInstance,
        getLatestFailedInstances,
        registerDeployHandler,
        awsServiceMatrix,
        awsServicesMap,
        awsServiceMatrixError,
        refetchAwsServiceMatrix,
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
