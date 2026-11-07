/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import type { z } from '@kbn/zod';
import { getDashboardDataSchema } from '@kbn/as-code-dashboard-schema';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import {
  requiresRegisteredSchema,
  type DashboardValidationIssue,
  type DashboardValidator,
} from '@kbn/dashboard-agent-authoring';

// Panels are loose objects in the dashboard application schema, so embeddable schemas are not needed.
const getDashboardAppStateSchema = once(() =>
  getDashboardDataSchema({}, { isDashboardAppRequest: true })
);

const MAX_UNION_MESSAGE_LENGTH = 1000;

const formatNestedIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.map(String).join('.');
  const message = formatIssueMessage(issue);
  return path ? `${path}: ${message}` : message;
};

/** Lists the issues of every union option, since Zod only reports "Invalid input" for a union. */
const formatIssueMessage = (issue: z.core.$ZodIssue): string => {
  if (issue.code === 'invalid_union' && issue.errors.length > 0) {
    const options = issue.errors.map(
      (optionIssues) => `(${optionIssues.map(formatNestedIssue).join(', ')})`
    );
    const message = `No union option matched: ${options.join(' | ')}`;
    return message.length > MAX_UNION_MESSAGE_LENGTH
      ? `${message.slice(0, MAX_UNION_MESSAGE_LENGTH)}…`
      : message;
  }
  if (issue.code === 'unrecognized_keys') {
    return `Unrecognized keys: ${issue.keys.join(', ')}`;
  }
  return issue.message;
};

const toValidationIssues = (issues: z.core.$ZodIssue[]): DashboardValidationIssue[] =>
  issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ path: [...issue.path, key], message: 'Unrecognized key' }));
    }
    return [{ path: issue.path, message: formatIssueMessage(issue) }];
  });

/**
 * Validates a dashboard the way the dashboard application validates it on save: dashboard fields
 * against the dashboard application schema, then each panel config against the schema of its type.
 * Panels of a type without a schema are not validated: Lens, for one, registers no schema while its
 * as-code API is disabled. Panel kinds that set `schemaAlwaysRegistered` (ML, whose embeddables are
 * registered only when anomaly detection is on) are the exception: a missing schema is reported as
 * the type being unavailable. Vega panels are skipped because the attachment stores them in an
 * interim shape that is converted before the dashboard is rendered.
 */
export const createDashboardAppStateValidator = ({
  getTransforms,
}: Pick<EmbeddableStart, 'getTransforms'>): DashboardValidator => ({
  validatePanel: ({ type, config }) => {
    if (type === VEGA_VIS_TYPE) {
      return [];
    }
    const transformType = type === LENS_EMBEDDABLE_TYPE ? 'lens-dashboard-app' : type;
    const schema = getTransforms(transformType)?.schema;
    if (!schema) {
      return requiresRegisteredSchema(type)
        ? [
            `type: panel type "${type}" is not available in this deployment, so it cannot be added or edited. Do not retry it; tell the user it is unavailable.`,
          ]
        : [];
    }
    const configResult = schema.safeParse(config);
    return configResult.success
      ? []
      : toValidationIssues(configResult.error.issues).map(
          ({ path, message }) => `${['config', ...path].map(String).join('.')}: ${message}`
        );
  },
  validateDashboardFields: (dashboardData) => {
    const result = getDashboardAppStateSchema().safeParse(dashboardData);
    return result.success ? [] : toValidationIssues(result.error.issues);
  },
});
