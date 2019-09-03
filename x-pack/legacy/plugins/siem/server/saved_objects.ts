/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { noteSavedObjectType, noteSavedObjectMappings } from './lib/note/saved_object_mappings';
import {
  pinnedEventSavedObjectType,
  pinnedEventSavedObjectMappings,
} from './lib/pinned_event/saved_object_mappings';
import {
  timelineSavedObjectType,
  timelineSavedObjectMappings,
} from './lib/timeline/saved_object_mappings';

export { noteSavedObjectType, pinnedEventSavedObjectType, timelineSavedObjectType };
export const savedObjectMappings = {
  ...timelineSavedObjectMappings,
  ...noteSavedObjectMappings,
  ...pinnedEventSavedObjectMappings,
};
