/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ServiceIdentifier } from 'inversify';

export const EsServiceInternalToken = Symbol.for(
  'alerting_v2.EsServiceInternal'
) as ServiceIdentifier<ElasticsearchClient>;

export const EsServiceScopedToken = Symbol.for(
  'alerting_v2.EsServiceScoped'
) as ServiceIdentifier<ElasticsearchClient>;
