/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
export interface DecodedCloudId {
  host: string;
  defaultPort: string;
  elasticsearchUrl: string;
  kibanaUrl: string;
}
export declare function decodeCloudId(cid: string, logger: Logger): DecodedCloudId | undefined;
