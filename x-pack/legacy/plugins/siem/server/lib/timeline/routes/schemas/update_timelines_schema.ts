/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { unionWithNullType } from '../../../framework';
import { SavedTimelineRuntimeType, TimelineTypeLiterals } from '../../types';

export const updateTimelineSchema = rt.type({
  templateTimelineId: unionWithNullType(rt.string),
  timeline: SavedTimelineRuntimeType,
  timelineId: unionWithNullType(rt.string),
  version: unionWithNullType(rt.string),
  type: rt.union([
    rt.literal(TimelineTypeLiterals.default),
    rt.literal(TimelineTypeLiterals.template),
  ]),
  pinndedEventIds: rt.array(unionWithNullType(rt.string)),
});
