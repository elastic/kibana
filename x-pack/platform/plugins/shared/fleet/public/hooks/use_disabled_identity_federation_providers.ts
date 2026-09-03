/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { CloudProvider } from '../../common/types';
import { IDENTITY_FEDERATION_ENABLED_FLAGS } from '../../common/constants/cloud_connector';

import { useStartServices } from './use_core';

/**
 * Returns the cloud providers whose identity federation has been switched off via LaunchDarkly
 * (see IDENTITY_FEDERATION_ENABLED_FLAGS). Providers without a flag are never disabled.
 * Consumers hide the matching var_group options from the package policy form.
 */
export function useDisabledIdentityFederationProviders(): readonly CloudProvider[] {
  const { featureFlags } = useStartServices();

  return useMemo(
    () =>
      (
        Object.entries(IDENTITY_FEDERATION_ENABLED_FLAGS) as Array<
          [CloudProvider, string | undefined]
        >
      )
        .filter(([, flag]) => flag !== undefined && !featureFlags.getBooleanValue(flag, true))
        .map(([provider]) => provider),
    [featureFlags]
  );
}
