/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import {
  columns,
  created,
  createdBy,
  dataProviders,
  dateRange,
  description,
  eventNotes,
  eventType,
  favorite,
  filters,
  globalNotes,
  kqlMode,
  kqlQuery,
  savedObjectId,
  savedQueryId,
  sort,
  title,
  updated,
  updatedBy,
  version,
  pinnedEventIds,
} from './schemas';

export const importTimelinesPayloadSchema = Joi.object({
  file: Joi.object().required(),
});

export const importTimelinesSchema = Joi.object({
  columns,
  created,
  createdBy,
  dataProviders,
  dateRange,
  description,
  eventNotes,
  eventType,
  filters,
  favorite,
  globalNotes,
  kqlMode,
  kqlQuery,
  savedObjectId,
  savedQueryId,
  sort,
  title,
  updated,
  updatedBy,
  version,
  pinnedEventIds,
});
