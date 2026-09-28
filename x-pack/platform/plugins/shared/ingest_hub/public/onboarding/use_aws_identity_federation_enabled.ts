/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '@kbn/fleet-plugin/common';

/** Mirrors the Fleet kill switch for AWS identity federation; defaults to enabled. */
export const useAwsIdentityFederationEnabled = (): boolean => {
  const {
    services: { featureFlags },
  } = useKibana<CoreStart>();

  return featureFlags.useBooleanValue(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true);
};
