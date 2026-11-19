/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Publishes the AWS Re-invent nav variant so Observability can rebuild the
 * left nav without importing this Streams bundle.
 *
 * The flag itself lives in `elasticOn_v_awsReinvent` (written by
 * VariationProvider). This subject only notifies the nav that it changed.
 */

import { BehaviorSubject } from 'rxjs';

/** Must match the key in observability `entity_centric_lab_integrations.ts`. */
export const AWS_NAV_VARIANT_GLOBAL_KEY = '__kbnEntityCentricLabAwsNav$__';

const STORAGE_KEY = 'elasticOn_v_awsReinvent';

export const readAwsReinventEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
};

interface SharedState {
  readonly subject: BehaviorSubject<boolean>;
}

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[AWS_NAV_VARIANT_GLOBAL_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<boolean>(readAwsReinventEnabled()) };
    root[AWS_NAV_VARIANT_GLOBAL_KEY] = state;
  }
  return state;
};

/** Re-read localStorage and push the current flag to the nav. */
export const publishAwsNavVariant = (): void => {
  getSharedState().subject.next(readAwsReinventEnabled());
};
