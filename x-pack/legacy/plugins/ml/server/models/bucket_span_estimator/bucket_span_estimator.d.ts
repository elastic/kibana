/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { BucketSpanEstimatorData } from '../../../public/application/services/ml_api_service';

export function estimateBucketSpanFactory(
  callAsCurrentUser: IScopedClusterClient['callAsCurrentUser'],
  callAsInternalUser: IScopedClusterClient['callAsInternalUser'],
  xpackMainPlugin: any
): (config: BucketSpanEstimatorData) => Promise<any>;
