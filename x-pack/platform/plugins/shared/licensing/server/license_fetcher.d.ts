/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { IClusterClient, Logger } from '@kbn/core/server';
import type { LicenseFetcher } from './types';
export declare const getLicenseFetcher: ({
  clusterClient,
  logger,
  cacheDurationMs,
  maxRetryDelay,
}: {
  clusterClient: MaybePromise<IClusterClient>;
  logger: Logger;
  cacheDurationMs: number;
  maxRetryDelay: number;
}) => LicenseFetcher;
