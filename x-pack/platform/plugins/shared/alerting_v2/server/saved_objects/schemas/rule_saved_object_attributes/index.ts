/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV1 } from './v1';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV3 } from './v3';

export type RuleSavedObjectAttributes = TypeOf<typeof ruleSavedObjectAttributesSchemaV3>;

export { ruleSavedObjectAttributesSchemaV1, ruleSavedObjectAttributesSchemaV3 };
