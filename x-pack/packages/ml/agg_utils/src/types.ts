/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

// TODO Temporary type definition until we can import from `@kbn/core`.
// Copied from src/core/server/elasticsearch/client/types.ts
// as these types aren't part of any package yet. Once they are, remove this completely

/**
 * Client used to query the elasticsearch cluster.
 * @deprecated At some point use the one from src/core/server/elasticsearch/client/types.ts when it is made into a package. If it never is, then keep using this one.
 * @public
 */
export type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;
