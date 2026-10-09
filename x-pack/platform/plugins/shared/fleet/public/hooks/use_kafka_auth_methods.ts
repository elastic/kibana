/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_KAFKA_OAUTH2_AUTH_FLAG } from '../../common/constants';

import { useStartServices } from '.';

/**
 * Returns which optional Kafka output authentication methods are enabled through feature flags,
 * e.g. `fleet.enableKafkaOAuth2Auth`. Fallback is false.
 */
export const useKafkaAuthMethods = (): {
  isOAuth2Enabled: boolean;
} => {
  const { featureFlags } = useStartServices();

  return {
    isOAuth2Enabled: featureFlags.useBooleanValue(ENABLE_KAFKA_OAUTH2_AUTH_FLAG, false),
  };
};
