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
import {
  ruleStatusSavedObjectMappings,
  ruleStatusSavedObjectType,
} from './lib/detection_engine/rules/saved_object_mappings';

import listsMapping from './lib/detection_engine/lists/mappings.json';
import { hasListsFeature } from './lib/detection_engine/feature_flags';

export {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  ruleStatusSavedObjectType,
  timelineSavedObjectType,
};

const savedObjectListsMapping = hasListsFeature() ? listsMapping : {};

export const savedObjectMappings = {
  ...timelineSavedObjectMappings,
  ...noteSavedObjectMappings,
  ...pinnedEventSavedObjectMappings,
  ...ruleStatusSavedObjectMappings,
  ...savedObjectListsMapping,
};
