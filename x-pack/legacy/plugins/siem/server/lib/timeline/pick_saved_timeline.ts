/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestAuth } from 'hapi';
import { getOr } from 'lodash/fp';
import { SavedTimeline } from './types';

export const pickSavedTimeline = (
  timelineId: string | null,
  savedTimeline: SavedTimeline,
  userInfo: RequestAuth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (timelineId == null) {
    savedTimeline.created = new Date().valueOf();
    savedTimeline.createdBy = getOr(null, 'credentials.username', userInfo);
    savedTimeline.updated = new Date().valueOf();
    savedTimeline.updatedBy = getOr(null, 'credentials.username', userInfo);
  } else if (timelineId != null) {
    savedTimeline.updated = new Date().valueOf();
    savedTimeline.updatedBy = getOr(null, 'credentials.username', userInfo);
  }
  return savedTimeline;
};
