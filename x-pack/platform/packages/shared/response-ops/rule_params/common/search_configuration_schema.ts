/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  MAX_APM_FIELD_VALUE_LENGTH,
  MAX_QUERY_LANGUAGE_LENGTH,
  MAX_SEARCH_QUERY_LENGTH,
} from './constants';

export const searchConfigurationSchema = schema.object({
  query: schema.object({
    query: schema.oneOf([
      schema.string({ maxLength: MAX_SEARCH_QUERY_LENGTH }),
      schema.recordOf(schema.string({ maxLength: MAX_APM_FIELD_VALUE_LENGTH }), schema.any()),
    ]),
    language: schema.string({ maxLength: MAX_QUERY_LANGUAGE_LENGTH }),
  }),
});

export type SearchConfigurationType = TypeOf<typeof searchConfigurationSchema>;
