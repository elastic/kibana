/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Timeline } from '../../saved_object';
import { FrameworkRequest } from '../../../framework';
import { SavedTimeline } from '../../types';
import { TimelineType } from '../../../detection_engine/routes/__mocks__';

const timelineLib = new Timeline();

export const saveTemplateTimelines = async (
  frameworkRequest: FrameworkRequest,
  templateTimeline: SavedTimeline,
  timelineId?: string | null,
  timelineVersion?: string | null
) => {
  console.log('-------');
  const newTimelineRes = await timelineLib.persistTimeline(
    frameworkRequest,
    timelineId ?? null,
    timelineVersion ?? null,
    templateTimeline,
    TimelineType.template
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
  timelineVersion?: string | null
) => {
  const { newTemplateTimelineId } = await saveTemplateTimelines(
    frameworkRequest,
    templateTimeline,
    timelineId,
    timelineVersion
  );

  return newTemplateTimelineId;
};
