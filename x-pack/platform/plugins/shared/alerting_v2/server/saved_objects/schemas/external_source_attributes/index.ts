/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ExternalSourceType } from '@kbn/alerting-v2-schemas';
import { externalSourceAttributesSchemaV1 } from './v1';

/**
 * Latest attributes shape, introduced by model version 1. The schema stores `type` as an open
 * string, and the API layer only writes supported sources, so it is narrowed here.
 */
export type ExternalSourceSavedObjectAttributes = Omit<
  TypeOf<typeof externalSourceAttributesSchemaV1>,
  'type'
> & { type: ExternalSourceType };

export { externalSourceAttributesSchemaV1 };
