/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const parseAutoFollowError = error => {
  if (!error.leaderIndex) {
    return null;
  }

  const { leaderIndex, autoFollowException } = error;
  const id = leaderIndex.substring(0, leaderIndex.lastIndexOf(':'));

  return {
    id,
    leaderIndex,
    autoFollowException,
  };
};

/**
 * Parse an array of auto-follow pattern errors and returns
 * an object where each key is an auto-follow pattern id
 */
export const parseAutoFollowErrors = (recentAutoFollowErrors, maxErrorsToShow = 5) =>
  recentAutoFollowErrors
    .map(parseAutoFollowError)
    .filter(error => error !== null)
    .reduce((byId, error) => {
      if (!byId[error.id]) {
        byId[error.id] = [];
      }

      if (byId[error.id].length === maxErrorsToShow) {
        return byId;
      }

      byId[error.id].push(error);
      return byId;
    }, {});
