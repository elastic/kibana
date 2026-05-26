/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useCallback, useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { AwsStaticKeyCredentials } from '@kbn/fleet-plugin/public';

export interface ConnectStepState {
  connectorId?: string;
  staticKeys?: AwsStaticKeyCredentials;
}

// Only non-sensitive fields are persisted — password values are never written to session storage
interface PersistedConnectStep {
  connectorId?: string;
  accessKeyId?: string;
}

interface OnboardingFlowState {
  connectStep: ConnectStepState;
  setConnectorId: (id: string | undefined) => void;
  setStaticKeys: (keys: AwsStaticKeyCredentials | undefined) => void;
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
    persisted?.accessKeyId
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
      setPersisted({ accessKeyId: keys?.access_key_id });
    },
    [setPersisted]
  );

  const connectStep: ConnectStepState = {
    connectorId: persisted?.connectorId,
    staticKeys,
  };

  return (
    <OnboardingFlowContext.Provider value={{ connectStep, setConnectorId, setStaticKeys }}>
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
