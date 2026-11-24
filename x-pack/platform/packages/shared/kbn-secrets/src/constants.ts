/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECRET_PROVIDER_TYPE = {
  kibana: 'kibana',
  connector: 'connector',
} as const;

export const SECRET_NAME_MAX_LENGTH = 128;
export const SECRET_DESCRIPTION_MAX_LENGTH = 1024;
export const SECRET_VALUE_MIN_LENGTH = 8;
export const SECRET_VALUE_MAX_LENGTH = 16384;
export const SECRET_REFERENCE_MAX_LENGTH = 1024;
