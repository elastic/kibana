/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateDeclaration } from './document_schema';
import type { StateValue } from './interpolation';

/** The value every state key starts with when a panel loads. */
export const getStateDefaults = (
  declarations: Readonly<Record<string, StateDeclaration>>
): Record<string, StateValue> =>
  Object.fromEntries(Object.entries(declarations).map(([key, { default: value }]) => [key, value]));
