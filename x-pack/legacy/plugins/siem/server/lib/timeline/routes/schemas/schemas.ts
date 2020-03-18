/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';

const columnHeaderType = Joi.string();
export const created = Joi.number().allow(null);
export const createdBy = Joi.string();
export const dataProviders = Joi.array();
export const description = Joi.string().allow(null);
export const end = Joi.number();
export const eventId = Joi.string();
export const eventType = Joi.string();

export const filters = Joi.array();

const id = Joi.string();
export const kqlMode = Joi.string();

export const noteId = Joi.string();
export const note = Joi.string();

export const start = Joi.number();
export const savedQueryId = Joi.string().allow(null);
export const savedObjectId = Joi.string().allow(null);

export const timelineId = Joi.string().allow(null);
export const title = Joi.string().allow(null);

export const updated = Joi.number().allow(null);
export const updatedBy = Joi.string().allow(null);
export const version = Joi.string().allow(null);

export const columns = Joi.array().items(
  Joi.object({
    columnHeaderType,
    id,
  }).required()
);
export const dateRange = Joi.object({
  start,
  end,
});
export const eventNotes = Joi.array().items({
  noteId,
  version,
  eventId,
  note,
  timelineId,
  created,
  createdBy,
  updated,
  updatedBy,
});
export const globalNotes = Joi.array().items({
  noteId,
  version,
  note,
  timelineId,
  created,
  createdBy,
  updated,
  updatedBy,
});
export const kqlQuery = Joi.object({
  filterQuery: Joi.object({
    kuery: Joi.object({
      kind: Joi.string(),
      expression: Joi.string(),
    }),
    serializedQuery: Joi.string(),
  }),
});
export const pinnedEventIds = Joi.array().items(Joi.string());
export const sort = Joi.object({
  columnId: Joi.string(),
  sortDirection: Joi.string(),
});
