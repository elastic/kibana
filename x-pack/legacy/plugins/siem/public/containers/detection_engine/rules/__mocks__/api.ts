/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AddRulesProps, NewRule } from '..';
import { ruleMock } from '../mock';

export const addRule = async ({ rule, signal }: AddRulesProps): Promise<NewRule> =>
  Promise.resolve(ruleMock);
