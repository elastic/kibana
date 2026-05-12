/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from '@kbn/apm-common';

export const environmentStringRt = t.union([
  t.literal(ENVIRONMENT_NOT_DEFINED.value),
  t.literal(ENVIRONMENT_ALL.value),
  t.string,
  nonEmptyStringRt,
]);

export const environmentRt = t.type({
  environment: environmentStringRt,
});

export type Environment = t.TypeOf<typeof environmentRt>['environment'];
