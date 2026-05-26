/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useCallback, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { AwsStaticKeyCredentials, AwsTemporaryKeyCredentials } from '@kbn/fleet-plugin/public';

export interface ConnectStepState {
  connectorId?: string;
  staticKeys?: AwsStaticKeyCredentials;
  temporaryKeys?: AwsTemporaryKeyCredentials;
}

// Only non-sensitive fields are persisted — password values are never written to session storage
interface PersistedConnectStep {
  connectorId?: string;
  authType?: 'static_keys' | 'temporary_keys';
  accessKeyId?: string;
}

interface OnboardingFlowState {
  connectStep: ConnectStepState;
  setConnectorId: (id: string | undefined) => void;
  setStaticKeys: (keys: AwsStaticKeyCredentials | undefined) => void;
  setTemporaryKeys: (keys: AwsTemporaryKeyCredentials | undefined) => void;
}

const OnboardingFlowContext = createContext<OnboardingFlowState | undefined>(undefined);

export function OnboardingFlowProvider({ children }: { children: React.ReactNode }) {
  const [persisted, setPersisted] = useSessionStorage<PersistedConnectStep>(
    'onboarding.aws.connectStep',
    {}
  );

  // Sensitive fields (secret_access_key, session_token) live in memory only.
  // access_key_id is restored from session storage; passwords start empty on page refresh.
  const [staticKeys, setStaticKeysState] = useState<AwsStaticKeyCredentials | undefined>(() =>
    persisted?.authType === 'static_keys' && persisted.accessKeyId
      ? { access_key_id: persisted.accessKeyId, secret_access_key: '' }
      : undefined
  );

  const [temporaryKeys, setTemporaryKeysState] = useState<AwsTemporaryKeyCredentials | undefined>(
    () =>
      persisted?.authType === 'temporary_keys' && persisted.accessKeyId
        ? { access_key_id: persisted.accessKeyId, secret_access_key: '', session_token: '' }
        : undefined
  );

  const setConnectorId = useCallback(
    (id: string | undefined) => setPersisted({ connectorId: id }),
    [setPersisted]
  );

  const setStaticKeys = useCallback(
    (keys: AwsStaticKeyCredentials | undefined) => {
      setStaticKeysState(keys);
      setTemporaryKeysState(undefined);
      setPersisted({
        authType: keys ? 'static_keys' : undefined,
        accessKeyId: keys?.access_key_id,
      });
    },
    [setPersisted]
  );

  const setTemporaryKeys = useCallback(
    (keys: AwsTemporaryKeyCredentials | undefined) => {
      setTemporaryKeysState(keys);
      setStaticKeysState(undefined);
      setPersisted({
        authType: keys ? 'temporary_keys' : undefined,
        accessKeyId: keys?.access_key_id,
      });
    },
    [setPersisted]
  );

  const connectStep: ConnectStepState = {
    connectorId: persisted?.connectorId,
    staticKeys,
    temporaryKeys,
  };

  return (
    <OnboardingFlowContext.Provider
      value={{ connectStep, setConnectorId, setStaticKeys, setTemporaryKeys }}
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
