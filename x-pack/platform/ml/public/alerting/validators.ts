/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { numberValidator } from '@kbn/ml-agg-utils';
import { timeIntervalInputValidator } from '../../common/util/validators';
export const validateLookbackInterval = timeIntervalInputValidator();
export const validateTopNBucket = numberValidator({ min: 1 });
