/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Working names until the backend settles them:
 * https://github.com/elastic/ingest-dev/issues/10236
 */
export const REMOTE_ELASTICSEARCH_TYPE = 'remote_elasticsearch' as const;

export const REMOTE_ELASTICSEARCH_ENDPOINT_ENTRY = 'endpoint';

export const remoteElasticsearchCredentialName = (id: string): string => `${id}-api-key`;
