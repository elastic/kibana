/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from '../../common/constants';

export const customContentStateSchema = schema.object({
  prompt: schema.maybe(schema.string({ maxLength: CUSTOM_CONTENT_MAX_PROMPT_LENGTH })),
  template: schema.maybe(schema.string({ maxLength: CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH })),
});

export const customContentEmbeddableSchema = schema.allOf([
  customContentStateSchema,
  serializedTitlesSchema,
]);

export type CustomContentState = TypeOf<typeof customContentStateSchema>;
export type CustomContentEmbeddableState = TypeOf<typeof customContentEmbeddableSchema>;
