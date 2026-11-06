/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_APP_DESCRIPTION_LENGTH, MAX_APP_TITLE_LENGTH } from '../../common/constants';

/**
 * What is stored, as the saved objects client can check it. The document is only checked for its
 * outline here: its real rules (node types, references between nodes, limits) are the schema of
 * `@kbn/custom-app-common`, which the routes apply before anything is saved and which the panel
 * applies again when it reads one, so a document written by another build or by hand never breaks
 * a dashboard.
 */
export const customAppAttributesSchemaV1 = schema.object({
  title: schema.string({ maxLength: MAX_APP_TITLE_LENGTH }),
  description: schema.maybe(schema.string({ maxLength: MAX_APP_DESCRIPTION_LENGTH })),
  /** The version of the document's own format, as in a panel's state. */
  version: schema.number(),
  document: schema.object({
    state: schema.recordOf(schema.string(), schema.any()),
    root: schema.recordOf(schema.string(), schema.any()),
    /** How the app looks. Its accents and shapes are checked by the schema of the document. */
    theme: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  }),
});
