/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { changelogEntrySchema, integrationSchemaV4 } from './integration_schema';
import type { dataStreamSchemaV2, fieldTypeOverrideSchema } from './data_stream_schema';

export type IntegrationAttributes = TypeOf<typeof integrationSchemaV4>;
export type DataStreamAttributes = TypeOf<typeof dataStreamSchemaV2>;
export type FieldTypeOverride = TypeOf<typeof fieldTypeOverrideSchema>;
export type ChangelogEntry = TypeOf<typeof changelogEntrySchema>;
