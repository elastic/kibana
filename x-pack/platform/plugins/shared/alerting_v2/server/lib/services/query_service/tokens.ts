/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { QueryServiceContract } from './query_service';

/**
 * QueryService flavor that uses an Elasticsearch client scoped to the current request user:
 * `elasticsearch.client.asScoped(request).asCurrentUser`
 */
export const QueryServiceScopedToken = Symbol.for(
  'alerting_v2.QueryServiceScoped'
) as ServiceIdentifier<QueryServiceContract>;

/**
 * QueryService flavor that uses the internal Kibana system user:
 * `elasticsearch.client.asInternalUser`
 */
export const QueryServiceInternalToken = Symbol.for(
  'alerting_v2.QueryServiceInternal'
) as ServiceIdentifier<QueryServiceContract>;
