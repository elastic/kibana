/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawScheduledReportSchema as rawScheduledReportSchemaV5 } from './v5';
export * from './v5';

export const rawScheduledReportSchema = rawScheduledReportSchemaV5.extends({
  // Every stable id of the creator: a profile uid and/or a realm-qualified id (hashed if oversized). Both are
  // recorded when both are derivable, so the creator is recognised from a later request whichever
  // one it can derive. Absent on documents predating this version, and when an API key's creator
  // could not be resolved.
  createdById: schema.maybe(schema.arrayOf(schema.string())),
  // Set only when the document was created with an API key, which owns it alone.
  createdByApiKeyId: schema.maybe(schema.string()),
});
