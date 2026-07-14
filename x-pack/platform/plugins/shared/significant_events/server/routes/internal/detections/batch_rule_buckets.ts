/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { DEFAULT_PARALLEL_MAX_FAN_OUT } from '@kbn/workflows';
import type { ChangePointRuleBucket } from '../../../lib/significant_events/alerting/alerts_reader';

export const batchRuleBuckets = (buckets: ChangePointRuleBucket[]): ChangePointRuleBucket[][] =>
  chunk(buckets, DEFAULT_PARALLEL_MAX_FAN_OUT);
