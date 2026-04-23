/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '../../common';

export type AuthenticationInfo = Omit<
  AuthenticatedUser,
  'authentication_provider' | 'elastic_cloud_user'
>;
export type {
  ElasticsearchServiceStart,
  OnlineStatusRetryScheduler,
} from './elasticsearch_service';
export { ElasticsearchService } from './elasticsearch_service';
