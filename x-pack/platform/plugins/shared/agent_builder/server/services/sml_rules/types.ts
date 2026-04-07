/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SmlRule } from '@kbn/agent-builder-common';
import type { SmlRuleCreateBody } from '../../../common/http_api/sml_rules';

/**
 * Service interface for SML rules.
 *
 * Follows the scoped-client pattern: call `getScopedClient` with the
 * current request to obtain a client whose ES operations are properly
 * attributed to the caller.
 */
export interface SmlRulesService {
  getScopedClient(options: { request: KibanaRequest }): SmlRulesClient;
}

/**
 * Request-scoped client for SML rule CRUD operations.
 */
export interface SmlRulesClient {
  /** Create a new rule or update an existing one. */
  createOrUpdate(id: string, body: SmlRuleCreateBody): Promise<SmlRule>;

  /** Get a single rule by ID. Throws if not found. */
  get(id: string): Promise<SmlRule>;

  /** List all rules. */
  list(): Promise<SmlRule[]>;

  /** Delete a rule by ID. Returns true if deleted. Throws if not found. */
  delete(id: string): Promise<boolean>;
}
