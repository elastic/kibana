/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

/*
 ** Serialized titles schema will soon be importable from a
 ** @kbn/presentation-publishing-schemas package.
 ** See https://github.com/elastic/kibana/pull/235977.
 */

export const serializedTitlesSchema = schema.object({
  title: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
  hidePanelTitles: schema.maybe(schema.boolean()),
});
