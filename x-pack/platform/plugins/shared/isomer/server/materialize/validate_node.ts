/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaIsomerRuntime, ValidationError } from '@kbn/isomer';
import type { MaterializedNode } from './nodes';

interface SchemaIssue {
  path: PropertyKey[];
  message: string;
}

interface NodeSchema {
  safeParse(
    value: unknown
  ): { success: true } | { success: false; error: { issues: SchemaIssue[] } };
}

/** `data.columns[0].type`, as the runtime formats a path. */
const formatPath = (path: PropertyKey[]): string =>
  path.reduce<string>((formatted, key) => {
    if (typeof key === 'number') {
      return `${formatted}[${key}]`;
    }
    return formatted ? `${formatted}.${String(key)}` : String(key);
  }, '');

const COMPOSITION_NODE_PATH = /^body\[0\]\.?/;

/**
 * Validates a node against the Isomer version Kibana pins: the input budget, then the charts pack's
 * schemas for its nodes, and the runtime's packs for the rest. Paths are relative to the node.
 */
export const createNodeValidator =
  (getRuntime: () => Promise<KibanaIsomerRuntime>) =>
  async (node: MaterializedNode): Promise<ValidationError[]> => {
    const { checkInputBudget, gridSchema, metricSchema, unsupportedSchema, xyChartSchema } =
      await import('@kbn/isomer');
    const budget = checkInputBudget(node);
    if (!budget.valid) {
      return [budget.error];
    }
    const chartsPackSchemas: Record<string, NodeSchema> = {
      metric: metricSchema,
      xyChart: xyChartSchema,
      grid: gridSchema,
      unsupported: unsupportedSchema,
    };
    const schema = chartsPackSchemas[node.type];
    if (schema) {
      const result = schema.safeParse(node);
      return result.success
        ? []
        : result.error.issues.map(({ path, message }) => ({
            path: formatPath(path),
            message,
            nodeType: node.type,
          }));
    }
    const runtime = await getRuntime();
    return runtime
      .validate({ type: 'view', body: [node] })
      .errors.map((error) => ({ ...error, path: error.path.replace(COMPOSITION_NODE_PATH, '') }));
  };
