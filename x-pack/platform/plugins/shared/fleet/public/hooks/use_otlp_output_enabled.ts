/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_OTLP_OUTPUT_FLAG } from '../../common/constants';

import { useStartServices } from '.';

/** Whether the OTLP output type is enabled through the `fleet.enableOtlpOutput` feature flag. */
export const useOtlpOutputEnabled = (): boolean => {
  const { featureFlags } = useStartServices();

  return featureFlags.useBooleanValue(ENABLE_OTLP_OUTPUT_FLAG, false);
};
