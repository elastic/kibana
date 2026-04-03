/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SmlRule, SmlRuleCreateBody } from '../../../common/http_api/sml_rules';

/**
 * Service interface for SML rule CRUD operations.
 *
 * Each method takes an `esClient` scoped to the current request
 * so that system index operations are properly attributed.
 */
export interface SmlRulesService {
  /** Create a new rule or update an existing one. */
  createOrUpdate(
    id: string,
    body: SmlRuleCreateBody,
    esClient: ElasticsearchClient
  ): Promise<SmlRule>;

  /** Get a single rule by ID. Throws if not found. */
  get(id: string, esClient: ElasticsearchClient): Promise<SmlRule>;

  /** List all rules. */
  list(esClient: ElasticsearchClient): Promise<SmlRule[]>;

  /** Delete a rule by ID. Returns true if deleted. Throws if not found. */
  delete(id: string, esClient: ElasticsearchClient): Promise<boolean>;
}
