/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';
import { unionWithNullType } from '../../../framework';
import { SavedTimelineRuntimeType, TimelineTypeLiteralRt } from '../../types';

export const createTimelineSchema = rt.type({
  timeline: SavedTimelineRuntimeType,
  timelineId: unionWithNullType(rt.string),
  version: unionWithNullType(rt.string),
  timelineType: unionWithNullType(TimelineTypeLiteralRt),
});
