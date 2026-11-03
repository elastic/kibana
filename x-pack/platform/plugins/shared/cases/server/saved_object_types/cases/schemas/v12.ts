/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CASE_STATUS_KEY_LENGTH } from '../../../../common/constants/statuses';
import { casesSchema as casesSchemaV11 } from './v11';

/**
 * `status_key` names the space's status the case is in; `status` keeps holding its category.
 */
export const casesSchema = casesSchemaV11.extends({
  status_key: schema.maybe(
    schema.nullable(schema.string({ maxLength: MAX_CASE_STATUS_KEY_LENGTH }))
  ),
});
