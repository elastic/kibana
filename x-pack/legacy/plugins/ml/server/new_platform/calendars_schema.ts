/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const eventSchema = {
  description: schema.maybe(schema.string()),
  start_time: schema.any(),
  end_time: schema.any(),
  calendar_id: schema.string(),
  event_id: schema.string(),
};

export const calendarSchema = {
  calendarId: schema.string(),
  job_ids: schema.arrayOf(schema.maybe(schema.string())),
  description: schema.maybe(schema.string()),
  events: schema.arrayOf(
    schema.maybe(
      schema.object({
        description: schema.maybe(schema.string()),
        start_time: schema.any(),
        end_time: schema.any(),
      })
    )
  ),
};
