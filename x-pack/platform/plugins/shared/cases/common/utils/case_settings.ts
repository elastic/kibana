/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OWNER_INFO } from '../constants/owners';
import type { Owner } from '../constants/types';

export interface OwnerCaseSettings {
  syncAlerts: boolean;
  extractObservables: boolean;
  /** Attachments-tab observables table. Not persisted on the case. */
  observablesEnabled: boolean;
}

const UNAVAILABLE: OwnerCaseSettings = {
  syncAlerts: false,
  extractObservables: false,
  observablesEnabled: false,
};

/**
 * Per-owner case settings from `OWNER_INFO`. Unknown owners (e.g. an ownerless host before a
 * solution is selected) get every flag off.
 */
export const getCaseSettings = (owner: string): OwnerCaseSettings => {
  if (!Object.hasOwn(OWNER_INFO, owner)) {
    return UNAVAILABLE;
  }

  const { features } = OWNER_INFO[owner as Owner];

  return {
    syncAlerts: features.alerts.sync,
    extractObservables: features.observables.autoExtractDefault,
    observablesEnabled: features.observables.enabled,
  };
};

/**
 * Returns true when observable extraction must be blocked regardless of the space configuration.
 * Only known owners with observables explicitly disabled are blocked. Unknown owners (e.g. test
 * fixture owners not in OWNER_INFO) are not blocked so their space configuration is respected.
 */
export const isObservablesExtractionBlocked = (owner: string): boolean =>
  Object.hasOwn(OWNER_INFO, owner) && !OWNER_INFO[owner as Owner].features.observables.enabled;

/**
 * Resolves the effective `extractObservables` value for a new case, applying the full precedence
 * chain when the caller omitted the field:
 *   blocked by owner → false
 *   space config present → space config value
 *   no space config → owner autoExtractDefault
 *   owner unknown → false
 *
 * Pass `spaceExtractObservables` as `undefined` when no configuration exists for the owner.
 */
export const resolveExtractObservables = (
  owner: string,
  spaceExtractObservables: boolean | undefined
): boolean => {
  if (isObservablesExtractionBlocked(owner)) {
    return false;
  }
  return (
    spaceExtractObservables ??
    OWNER_INFO[owner as Owner]?.features.observables.autoExtractDefault ??
    false
  );
};
