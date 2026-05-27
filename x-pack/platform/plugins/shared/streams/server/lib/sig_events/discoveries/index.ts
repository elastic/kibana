/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DISCOVERIES_DATA_STREAM, discoveriesDataStream, discoveriesMappings } from './data_stream';
export type { Discovery, StoredDiscovery } from './data_stream';
export { DiscoveriesClient } from './discoveries_client';
export type { DiscoveriesDataStreamClient } from './discoveries_client';
export { DiscoveriesService } from './discoveries_service';
