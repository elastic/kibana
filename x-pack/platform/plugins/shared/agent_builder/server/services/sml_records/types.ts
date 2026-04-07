/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SmlDocument } from '../sml/types';
import type { SmlRecordCreateBody } from '../../../common/http_api/sml_records';

/**
 * Service interface for SML records.
 *
 * Follows the scoped-client pattern: call `getScopedClient` with the
 * current request to obtain a client whose ES operations are properly
 * attributed to the caller.
 */
export interface SmlRecordsService {
  getScopedClient(options: { request: KibanaRequest }): SmlRecordsClient;
}

/**
 * Request-scoped client for SML record CRUD operations.
 */
export interface SmlRecordsClient {
  /** Create a new record or update an existing one. Always marks records as `user_defined: true`. */
  createOrUpdate(id: string, body: SmlRecordCreateBody): Promise<SmlDocument>;

  /** Get a single record by ID. Throws if not found. */
  get(id: string): Promise<SmlDocument>;

  /** Delete a record by ID. Returns true if deleted. Throws if not found. */
  delete(id: string): Promise<boolean>;
}
