/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
export const timelineId = Joi.string().required();
export const pinnedEventIds = Joi.array().items(Joi.string());
export const noteIds = Joi.array().items(Joi.string());
export const objects = Joi.array().items(
  Joi.object({
    timelineId,
    pinnedEventIds,
    noteIds,
  }).required()
);

export const exclude_export_details = Joi.boolean();
export const file_name = Joi.string();
