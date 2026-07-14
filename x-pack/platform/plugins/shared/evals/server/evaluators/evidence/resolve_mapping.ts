/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVIDENCE_MAPPING_PROFILES } from './profiles';
import type { EvidenceMapping, EvidenceProfile } from './types';

export const getEvidenceMapping = (profile: EvidenceProfile): EvidenceMapping => {
  const mapping = EVIDENCE_MAPPING_PROFILES[profile];
  if (!mapping) {
    throw new Error(`Unknown evidence mapping profile: ${profile}`);
  }

  return mapping;
};
