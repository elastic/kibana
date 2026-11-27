/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useRecordClaims } from '../use_evidence_queries';

/** State of the "why it matters" and "link to claim" fields every kind shares. */
export const useSharedFields = (recordId: string) => {
  const { claims } = useRecordClaims(recordId);
  const [why, setWhy] = useState('');
  const [claimId, setClaimId] = useState('');
  const claim = claims.find(({ id }) => id === claimId);

  return { claims, why, setWhy, claimId, setClaimId, claim, trimmedWhy: why.trim() || null };
};
