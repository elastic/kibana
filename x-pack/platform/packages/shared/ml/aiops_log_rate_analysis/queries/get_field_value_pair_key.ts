/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValuePair } from '@kbn/ml-agg-utils';

/**
 * Use a tuple-based serialization to avoid delimiter "magic strings"
 * and accidental key collisions.
 */
export const getFieldValuePairKey = (
  fieldName: FieldValuePair['fieldName'],
  fieldValue: FieldValuePair['fieldValue']
): string => JSON.stringify([fieldName, fieldValue]);
