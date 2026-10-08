/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useManagedOnboarding } from '../hooks/use_managed_onboarding';
import type { CloudSetupForCloudConnector } from '../types';

import { ManagedOnboardingPanel } from './managed_onboarding_panel';

export interface ManagedOnboardingCalloutProps {
  cloud?: CloudSetupForCloudConnector;
}

/**
 * Self-contained entry point for the onboarding wizard: renders the managed-onboarding opt-in /
 * status callout whenever the POC is enabled, independent of which wizard step is open.
 */
export const ManagedOnboardingCallout: React.FC<ManagedOnboardingCalloutProps> = ({ cloud }) => {
  const managed = useManagedOnboarding(cloud);
  if (!managed.isEnabled) {
    return null;
  }
  return <ManagedOnboardingPanel credentials={managed.credentials} />;
};
