/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticatedUser } from '../../../../../../plugins/security/common/model';
import { SavedTimeline } from './types';

export const pickSavedTimeline = (
  timelineId: string | null,
  savedTimeline: SavedTimeline,
  userInfo: AuthenticatedUser | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const dateNow = new Date().valueOf();
  if (timelineId == null) {
    savedTimeline.created = dateNow;
    savedTimeline.createdBy = userInfo?.username ?? '';
    savedTimeline.updated = dateNow;
    savedTimeline.updatedBy = userInfo?.username ?? '';
  } else if (timelineId != null) {
    savedTimeline.updated = dateNow;
    savedTimeline.updatedBy = userInfo?.username ?? '';
    return savedTimeline;
  }
};
