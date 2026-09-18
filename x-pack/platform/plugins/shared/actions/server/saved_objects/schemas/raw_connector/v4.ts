/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawConnectorSchema as rawConnectorSchemaV3 } from './v3';

export const SPEC_VERSION_MAX_LENGTH = 32;
const SPEC_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export const validateSpecVersion = (value: string): string | undefined =>
  SPEC_VERSION_PATTERN.test(value) ? undefined : 'spec version must use the MAJOR.MINOR.PATCH form';

export const rawConnectorSchema = rawConnectorSchemaV3.extends({
  // Spec version the connector instance was created from. Absent on classic connectors and on
  // spec connectors created before pinning existed.
  specVersion: schema.maybe(
    schema.string({ maxLength: SPEC_VERSION_MAX_LENGTH, validate: validateSpecVersion })
  ),
});
