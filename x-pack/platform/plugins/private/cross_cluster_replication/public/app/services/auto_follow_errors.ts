/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecentAutoFollowError } from '../../../common/types';

export interface ParsedAutoFollowError {
  id: string;
  timestamp: number;
  leaderIndex: string;
  autoFollowException: {
    type: string;
    reason: string;
  };
}

export const parseAutoFollowError = (
  error: RecentAutoFollowError
): ParsedAutoFollowError | null => {
  if (!error.leaderIndex) {
    return null;
  }

  const { leaderIndex, autoFollowException, timestamp } = error;
  const id = leaderIndex.substring(0, leaderIndex.lastIndexOf(':'));

  return {
    id,
    timestamp,
    leaderIndex,
    autoFollowException,
  };
};

/**
 * Parse an array of auto-follow pattern errors and returns
 * an object where each key is an auto-follow pattern id
 */
export const parseAutoFollowErrors = (
  recentAutoFollowErrors: RecentAutoFollowError[],
  maxErrorsToShow = 5
): Record<string, ParsedAutoFollowError[]> =>
  recentAutoFollowErrors
    .map(parseAutoFollowError)
    .filter((error): error is ParsedAutoFollowError => error !== null)
    .reduce<Record<string, ParsedAutoFollowError[]>>((byId, error) => {
      if (!byId[error.id]) {
        byId[error.id] = [];
      }

      if (byId[error.id].length === maxErrorsToShow) {
        return byId;
      }

      byId[error.id].push(error);
      return byId;
    }, {});
