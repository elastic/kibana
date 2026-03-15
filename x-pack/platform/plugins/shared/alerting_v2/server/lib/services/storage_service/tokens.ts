/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { StorageService } from './storage_service';

/**
 * StorageService flavor that uses an Elasticsearch client scoped to the current request user:
 * `elasticsearch.client.asScoped(request).asCurrentUser`
 */
export const StorageServiceScopedToken = Symbol.for(
  'alerting_v2.StorageServiceScoped'
) as ServiceIdentifier<StorageService>;

/**
 * StorageService flavor that uses the internal Kibana system user:
 * `elasticsearch.client.asInternalUser`
 */
export const StorageServiceInternalToken = Symbol.for(
  'alerting_v2.StorageServiceInternal'
) as ServiceIdentifier<StorageService>;
