/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useCallback } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import type { AwsStaticKeyCredentials } from '@kbn/fleet-plugin/public';

export interface ConnectStepState {
  connectorId?: string;
  staticKeys?: AwsStaticKeyCredentials;
}

interface OnboardingFlowState {
  connectStep: ConnectStepState;
  setConnectorId: (id: string | undefined) => void;
  setStaticKeys: (keys: AwsStaticKeyCredentials | undefined) => void;
}

const OnboardingFlowContext = createContext<OnboardingFlowState | undefined>(undefined);

export function OnboardingFlowProvider({ children }: { children: React.ReactNode }) {
  const [connectStep, setConnectStep] = useSessionStorage<ConnectStepState>(
    'onboarding.aws.connectStep',
    {}
  );

  const setConnectorId = useCallback(
    (id: string | undefined) => setConnectStep({ connectorId: id }),
    [setConnectStep]
  );

  const setStaticKeys = useCallback(
    (keys: AwsStaticKeyCredentials | undefined) => setConnectStep({ staticKeys: keys }),
    [setConnectStep]
  );

  return (
    <OnboardingFlowContext.Provider
      value={{ connectStep: connectStep ?? {}, setConnectorId, setStaticKeys }}
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
