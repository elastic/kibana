/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import type { CloudProvider } from '../../common/types';
import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../common/constants/cloud_connector';

import { useStartServices } from './use_core';

const NONE: readonly CloudProvider[] = [];
const AWS: readonly CloudProvider[] = ['aws'];

/**
 * Returns the cloud providers whose identity federation has been switched off via LaunchDarkly.
 * Consumers hide the matching var_group options from the package policy form.
 *
 * Subscribes to `getBooleanValue$`, which emits immediately and again on every LaunchDarkly
 * push or evaluation-context change, so a flag flipped while the form is open takes effect
 * without a reload. Falls back to enabled when LaunchDarkly is unavailable.
 */
export function useDisabledIdentityFederationProviders(): readonly CloudProvider[] {
  const { featureFlags } = useStartServices();

  // getBooleanValue$ builds a new observable per call, so memoize it or useObservable
  // re-subscribes on every render.
  const awsEnabled$ = useMemo(
    () => featureFlags.getBooleanValue$(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true),
    [featureFlags]
  );
  const awsEnabled = useObservable(awsEnabled$, true);

  return awsEnabled ? NONE : AWS;
}
