/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '../../../constants';

/**
 * Maps a concrete attack discovery backing index to a readable pattern, since privileges are
 * granted on the alias rather than `.internal.alerts-*`, and the alias rejects single-document
 * operations once the index rolls over.
 *
 * Normalising at read time is deliberate: attachment metadata stores the concrete backing index.
 *
 * Other indices pass through unchanged, so security checks must gate on
 * {@link isAttackDiscoveryIndex} first.
 */
export const toReadableAttackIndexPattern = (index: string): string => {
  // Checked first: the adhoc index name contains the scheduled prefix as a substring.
  if (index.includes(ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX)) {
    return `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-*`;
  }
  if (index.includes(ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX)) {
    return `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-*`;
  }
  return index;
};

/** Whether an index name belongs to one of the two attack discovery alert index families. */
export const isAttackDiscoveryIndex = (index: string): boolean =>
  index.includes(ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX) ||
  index.includes(ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX);
