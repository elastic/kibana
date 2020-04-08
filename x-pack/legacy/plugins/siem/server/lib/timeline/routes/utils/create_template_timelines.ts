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
  templateTimelineId?: string | null,
  timelineVersion?: string | null
) => {
  const newTimelineRes = await timelineLib.persistTimeline(
    frameworkRequest,
    templateTimelineId ?? null,
    timelineVersion ?? null,
    templateTimeline
  );

  return {
    newTemplateTimelineId: newTimelineRes?.timeline?.savedObjectId ?? null,
    newTimelineVersion: newTimelineRes?.timeline?.version ?? null,
  };
};

export const createTemplateTimelines = async (
  frameworkRequest: FrameworkRequest,
  templateTimeline: SavedTimeline,
  templateTimelineId?: string | null,
  timelineVersion?: string | null
) => {
  const { newTemplateTimelineId } = await saveTemplateTimelines(
    frameworkRequest,
    templateTimeline,
    templateTimelineId,
    timelineVersion
  );

  return newTemplateTimelineId;
};

export const getTemplateTimeline = async (
  frameworkRequest: FrameworkRequest,
  templateTimelineId: string
) => {
  let timeline = null;
  try {
    timeline = await timelineLib.getTimeline(frameworkRequest, templateTimelineId);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return timeline;
};
