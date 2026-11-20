/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';

export interface CaseStatusChange {
  status: CaseStatuses;
  /**
   * The ISO date of the change
   */
  timestamp: string;
}

/**
 * The status-history fields of the analytics case document. The durations are in seconds.
 */
export interface CaseStatusHistoryFields {
  active_time_open: number;
  time_to_pickup: number | null;
  reopen_count: number;
}

const MS_IN_SECOND = 1000;

const toSeconds = (ms: number): number => Math.floor(ms / MS_IN_SECOND);

const isValidTime = (time: number): boolean => !Number.isNaN(time);

/**
 * Calculates the status-history fields from the creation date and the status changes of a case.
 * A case starts as open. The stretch after the last change runs until now when the case is not closed.
 */
export const calculateStatusHistoryFields = ({
  createdAt,
  statusChanges,
  now = new Date(),
}: {
  createdAt: string;
  statusChanges: CaseStatusChange[];
  now?: Date;
}): CaseStatusHistoryFields => {
  const createdAtMs = new Date(createdAt).getTime();

  const changes = statusChanges
    .map(({ status, timestamp }) => ({ status, time: new Date(timestamp).getTime() }))
    .filter(({ time }) => isValidTime(time) && time >= createdAtMs)
    .sort((first, second) => first.time - second.time);

  let activeTimeMs = 0;
  let reopenCount = 0;
  let pickupMs: number | null = null;
  let currentStatus = CaseStatuses.open;
  let currentSince = createdAtMs;

  for (const { status, time } of changes) {
    if (currentStatus !== CaseStatuses.closed) {
      activeTimeMs += time - currentSince;
    }

    if (currentStatus === CaseStatuses.closed && status !== CaseStatuses.closed) {
      reopenCount += 1;
    }

    if (pickupMs == null && status === CaseStatuses['in-progress']) {
      pickupMs = time - createdAtMs;
    }

    currentStatus = status;
    currentSince = time;
  }

  if (currentStatus !== CaseStatuses.closed) {
    activeTimeMs += Math.max(now.getTime() - currentSince, 0);
  }

  return {
    active_time_open: toSeconds(activeTimeMs),
    time_to_pickup: pickupMs == null ? null : toSeconds(pickupMs),
    reopen_count: reopenCount,
  };
};
