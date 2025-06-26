/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';

export interface IlmLocatorParams extends SerializableRecord {
  page: 'policies_list' | 'policy_edit' | 'policy_create';
  policyName?: string;
}
