/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * Template-fields sync service — POC stub.
 *
 * Future responsibility: listen for template SO writes and update the dynamic
 * mappings on `.cases-data.case` / `.cases-data.case_lifecycle` so newly declared
 * extended fields land in the correct typed sub-field (`value_long`, `value_date`,
 * etc.) without manual intervention.
 *
 * Current behavior: the writer's `case_doc_builder` projects every extended field
 * to `value_keyword` conservatively. This works without any sync, at the cost of
 * losing numeric/date semantics. The follow-up PR will:
 *
 *   1. Subscribe to template SO `update` / `create` events.
 *   2. Debounce (~2s) and recompute the union of declared field types.
 *   3. Patch the `cases-data.<surface>` index template with additional
 *      dynamic_templates as needed.
 *   4. Replace the keyword-only projection with a type-aware projection.
 *
 * Surfacing this as a stub now keeps the plugin wiring stable across the PRs.
 */
export class CasesTemplateFieldsSyncService {
  private readonly logger: Logger;

  constructor({ logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.logger = logger.get('cases.analytics.template_fields_sync');
  }

  start(): void {
    this.logger.debug('template-fields sync service: stub start');
  }

  stop(): void {
    this.logger.debug('template-fields sync service: stub stop');
  }
}
