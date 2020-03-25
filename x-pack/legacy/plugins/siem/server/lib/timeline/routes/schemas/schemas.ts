/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';

const allowEmptyString = Joi.string().allow([null, '']);
const columnHeaderType = Joi.string();
export const created = Joi.number().allow(null);
export const createdBy = Joi.string();

export const description = allowEmptyString;
export const end = Joi.number();
export const eventId = allowEmptyString;
export const eventType = Joi.string();

export const filters = Joi.array()
  .items(
    Joi.object({
      meta: Joi.object({
        alias: allowEmptyString,
        controlledBy: allowEmptyString,
        disabled: Joi.boolean().allow(null),
        field: allowEmptyString,
        formattedValue: allowEmptyString,
        index: {
          type: 'keyword',
        },
        key: {
          type: 'keyword',
        },
        negate: {
          type: 'boolean',
        },
        params: allowEmptyString,
        type: {
          type: 'keyword',
        },
        value: allowEmptyString,
      }),
      exists: allowEmptyString,
      match_all: allowEmptyString,
      missing: allowEmptyString,
      query: allowEmptyString,
      range: allowEmptyString,
      script: allowEmptyString,
    })
  )
  .allow(null);

const name = allowEmptyString;

export const noteId = allowEmptyString;
export const note = allowEmptyString;

export const start = Joi.number();
export const savedQueryId = allowEmptyString;
export const savedObjectId = allowEmptyString;

export const timelineId = allowEmptyString;
export const title = allowEmptyString;

export const updated = Joi.number().allow(null);
export const updatedBy = allowEmptyString;
export const version = allowEmptyString;

export const columns = Joi.array().items(
  Joi.object({
    aggregatable: Joi.boolean().allow(null),
    category: Joi.string(),
    columnHeaderType,
    description,
    example: allowEmptyString,
    indexes: allowEmptyString,
    id: Joi.string(),
    name,
    placeholder: allowEmptyString,
    searchable: Joi.boolean().allow(null),
    type: Joi.string(),
  }).required()
);
export const dataProviders = Joi.array()
  .items(
    Joi.object({
      id: Joi.string(),
      name: allowEmptyString,
      enabled: Joi.boolean().allow(null),
      excluded: Joi.boolean().allow(null),
      kqlQuery: allowEmptyString,
      queryMatch: Joi.object({
        field: allowEmptyString,
        displayField: allowEmptyString,
        value: allowEmptyString,
        displayValue: allowEmptyString,
        operator: allowEmptyString,
      }),
      and: Joi.array()
        .items(
          Joi.object({
            id: Joi.string(),
            name,
            enabled: Joi.boolean().allow(null),
            excluded: Joi.boolean().allow(null),
            kqlQuery: allowEmptyString,
            queryMatch: Joi.object({
              field: allowEmptyString,
              displayField: allowEmptyString,
              value: allowEmptyString,
              displayValue: allowEmptyString,
              operator: allowEmptyString,
            }).allow(null),
          })
        )
        .allow(null),
    })
  )
  .allow(null);
export const dateRange = Joi.object({
  start,
  end,
});
export const favorite = Joi.array().items(
  Joi.object({
    keySearch: Joi.string(),
    fullName: Joi.string(),
    userName: Joi.string(),
    favoriteDate: Joi.number(),
  }).allow(null)
);
const noteItem = Joi.object({
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
export const eventNotes = Joi.array().items(noteItem);
export const globalNotes = Joi.array().items(noteItem);
export const kqlMode = Joi.string();
export const kqlQuery = Joi.object({
  filterQuery: Joi.object({
    kuery: Joi.object({
      kind: Joi.string(),
      expression: allowEmptyString,
    }),
    serializedQuery: allowEmptyString,
  }),
});
export const pinnedEventIds = Joi.array()
  .items(Joi.string())
  .allow(null);
export const sort = Joi.object({
  columnId: Joi.string(),
  sortDirection: Joi.string(),
});
/* eslint-disable @typescript-eslint/camelcase */

export const ids = Joi.array().items(Joi.string());

export const exclude_export_details = Joi.boolean();
export const file_name = allowEmptyString;
