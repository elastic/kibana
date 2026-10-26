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
    extractObservables: features.observables.autoExtract,
    observablesEnabled: features.observables.enabled,
  };
};
