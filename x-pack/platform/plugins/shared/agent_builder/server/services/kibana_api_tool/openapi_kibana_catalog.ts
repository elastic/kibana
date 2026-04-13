/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Logger } from '@kbn/logging';
import { findWorkflowKibanaConnectorType } from './match_workflow_kibana_connector';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export interface KibanaOpenApiOperationSummary {
  operation_id: string;
  method: string;
  path: string;
  /** OpenAPI `summary` when present */
  summary?: string;
  /** Truncated OpenAPI `description` for UI / search */
  description?: string;
  workflow_connector_type: string | null;
}

export interface KibanaOpenApiIndexedOperation {
  summary: KibanaOpenApiOperationSummary;
  /** Resolved OpenAPI operation object (path item method value) */
  operation: Record<string, unknown>;
  path_template: string;
  method: string;
}

let cached: {
  doc: Record<string, unknown>;
  summaries: KibanaOpenApiOperationSummary[];
  byOperationId: Map<string, KibanaOpenApiIndexedOperation>;
} | null = null;

let loadError: string | null = null;

function getSpecPath(): string {
  return path.join(REPO_ROOT, 'oas_docs', 'output', 'kibana.yaml');
}

function buildIndex(doc: Record<string, unknown>, logger: Logger) {
  const paths = (doc.paths ?? {}) as Record<string, Record<string, unknown>>;
  const summaries: KibanaOpenApiOperationSummary[] = [];
  const byOperationId = new Map<string, KibanaOpenApiIndexedOperation>();

  for (const pathTemplate of Object.keys(paths)) {
    const pathItem = paths[pathTemplate];
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    for (const methodLower of HTTP_METHODS) {
      const operation = pathItem[methodLower];
      if (!operation || typeof operation !== 'object') {
        continue;
      }
      const op = operation as Record<string, unknown>;
      const operationId = op.operationId;
      if (typeof operationId !== 'string' || !operationId.length) {
        continue;
      }
      const method = methodLower.toUpperCase();
      const summaryText =
        typeof op.summary === 'string' && op.summary.trim().length > 0
          ? op.summary.trim()
          : undefined;
      const rawDescription =
        typeof op.description === 'string' && op.description.trim().length > 0
          ? op.description.trim()
          : undefined;
      const descriptionText =
        rawDescription && rawDescription.length > 800
          ? `${rawDescription.slice(0, 800)}…`
          : rawDescription;
      const workflowConnectorType = findWorkflowKibanaConnectorType(method, pathTemplate);
      const summary: KibanaOpenApiOperationSummary = {
        operation_id: operationId,
        method,
        path: pathTemplate,
        summary: summaryText,
        description: descriptionText,
        workflow_connector_type: workflowConnectorType,
      };
      summaries.push(summary);
      byOperationId.set(operationId, {
        summary,
        operation: op,
        path_template: pathTemplate,
        method,
      });
    }
  }

  logger.info(`Kibana OpenAPI catalog: indexed ${summaries.length} operations`);
  return { doc, summaries, byOperationId };
}

export function ensureKibanaOpenApiCatalog(logger: Logger): void {
  if (cached || loadError) {
    return;
  }
  const specPath = getSpecPath();
  if (!fs.existsSync(specPath)) {
    loadError = `OpenAPI spec not found at ${specPath}`;
    logger.warn(loadError);
    cached = { doc: {}, summaries: [], byOperationId: new Map() };
    return;
  }
  try {
    const raw = fs.readFileSync(specPath, 'utf8');
    const doc = YAML.parse(raw) as Record<string, unknown>;
    cached = buildIndex(doc, logger);
  } catch (e) {
    loadError = String(e);
    logger.error(`Failed to load Kibana OpenAPI catalog: ${loadError}`);
    cached = { doc: {}, summaries: [], byOperationId: new Map() };
  }
}

export function searchKibanaOpenApiOperations(
  logger: Logger,
  q: string,
  limit: number = 50
): KibanaOpenApiOperationSummary[] {
  ensureKibanaOpenApiCatalog(logger);
  const needle = q.trim().toLowerCase();
  const list = cached!.summaries;
  if (!needle) {
    return list.slice(0, limit);
  }
  const scored = list
    .map((s) => {
      const hay = `${s.operation_id} ${s.path} ${s.summary ?? ''} ${
        s.description ?? ''
      }`.toLowerCase();
      const idx = hay.indexOf(needle);
      return { s, idx };
    })
    .filter((x) => x.idx >= 0)
    .sort((a, b) => a.idx - b.idx)
    .slice(0, limit)
    .map((x) => x.s);
  return scored;
}

export function getKibanaOpenApiOperation(
  logger: Logger,
  operationId: string
): KibanaOpenApiIndexedOperation | undefined {
  ensureKibanaOpenApiCatalog(logger);
  return cached!.byOperationId.get(operationId);
}

export function getCachedOpenApiDocument(logger: Logger): Record<string, unknown> {
  ensureKibanaOpenApiCatalog(logger);
  return cached!.doc;
}
