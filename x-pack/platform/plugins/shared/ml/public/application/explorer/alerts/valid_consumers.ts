/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';

export const ML_VALID_CONSUMERS = [
  AlertConsumers.ML,
  AlertConsumers.ALERTS,
  AlertConsumers.STACK_ALERTS,
];
