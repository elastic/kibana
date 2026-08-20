/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Installation } from '../../../../../common/types';

/** True when another install attempt currently holds this package's dataset-claim reservation. */
export const hasLiveReservation = (
  pkg: Pick<Installation, 'install_status' | 'dataset_claim_attempt_id'> | undefined
): boolean => pkg?.install_status === 'installing' && Boolean(pkg.dataset_claim_attempt_id);

export const isReservedToAttempt = (
  pkg: Pick<Installation, 'dataset_claim_attempt_id'> | undefined,
  attemptId: string
): boolean => pkg?.dataset_claim_attempt_id === attemptId;
