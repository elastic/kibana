/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Timeline } from '../../saved_object';
import { FrameworkRequest } from '../../../framework';
import { SavedTimeline } from '../../types';

const timelineLib = new Timeline();

export const saveTemplateTimelines = async (
  frameworkRequest: FrameworkRequest,
  templateTimeline: SavedTimeline,
  timelineId?: string | null,
  timelineVersion?: string | null,
  templateTimelineId?: string | null
) => {
  const newTimelineRes = await timelineLib.persistTimeline(
    frameworkRequest,
    timelineId ?? null,
    timelineVersion ?? null,
    templateTimeline,
    templateTimelineId ?? null
  );

  return {
    newTemplateTimelineId: newTimelineRes?.timeline?.savedObjectId ?? null,
    newTimelineVersion: newTimelineRes?.timeline?.version ?? null,
  };
};

export const createTemplateTimelines = async (
  frameworkRequest: FrameworkRequest,
  templateTimeline: SavedTimeline,
  timelineId?: string | null,
  timelineVersion?: string | null,
  templateTimelineId?: string | null
) => {
  const { newTemplateTimelineId } = await saveTemplateTimelines(
    frameworkRequest,
    templateTimeline,
    timelineId,
    timelineVersion,
    templateTimelineId
  );

  return newTemplateTimelineId;
};
