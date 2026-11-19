/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECRET_NAME_MAX_LENGTH } from './constants';

const SECRET_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Returns whether a name can be used as a secret name and referenced as `secrets.<name>`. */
export const isValidSecretName = (name: string): boolean =>
  name.length <= SECRET_NAME_MAX_LENGTH && SECRET_NAME_PATTERN.test(name);

/** Returns the form of a name used to enforce uniqueness regardless of case. */
export const normalizeSecretName = (name: string): string => name.toLowerCase();
