/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Logger, CoreStatus, IClusterClient } from '@kbn/core/server';
export interface GetElasticsearchAndSOAvailabilityOpts {
  core$: Observable<CoreStatus>;
  isServerless: boolean;
  logger: Logger;
  getClusterClient: () => Promise<IClusterClient>;
}
export declare function getElasticsearchAndSOAvailability({
  core$,
  isServerless,
  logger,
  getClusterClient,
}: GetElasticsearchAndSOAvailabilityOpts): Observable<boolean>;
