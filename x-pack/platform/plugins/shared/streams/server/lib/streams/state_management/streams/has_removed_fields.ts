/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';

import _ from 'lodash';

export function hasRemovedFields(previous?: FieldDefinition, current?: FieldDefinition): boolean {
  const previousKeys = Object.keys(previous || {});
  const currentKeys = Object.keys(current || {});
  return _.difference(previousKeys, currentKeys).length > 0;
}
