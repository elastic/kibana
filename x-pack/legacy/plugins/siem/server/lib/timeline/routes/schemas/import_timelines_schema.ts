/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as runtimeTypes from 'io-ts';

import { eventNotes, globalNotes, pinnedEventIds } from './schemas';
import { SavedTimelineRuntimeType } from '../../types';

const file = runtimeTypes.intersection([
  runtimeTypes.UnknownRecord,
  runtimeTypes.type({
    hapi: runtimeTypes.type({ filename: runtimeTypes.string }),
  }),
]);
export const importTimelinesPayloadSchema = runtimeTypes.type({ file });

export const importTimelinesSchema = runtimeTypes.intersection([
  SavedTimelineRuntimeType,
  runtimeTypes.type({
    savedObjectId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  runtimeTypes.type({
    globalNotes,
    eventNotes,
    pinnedEventIds,
  }),
]);
