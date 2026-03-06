/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { dump, load } from 'js-yaml';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';

export interface YamlParseResult {
  values: FormValues | null;
  error: string | null;
}

/**
 * Convert FormValues to YAML-compatible object (snake_case keys for API compatibility)
 */
export const formValuesToYamlObject = (values: FormValues): Record<string, unknown> => ({
  kind: values.kind,
  metadata: {
    name: values.metadata.name,
    enabled: values.metadata.enabled,
    ...(values.metadata.description && { description: values.metadata.description }),
    ...(values.metadata.owner && { owner: values.metadata.owner }),
    ...(values.metadata.labels?.length && { labels: values.metadata.labels }),
  },
  time_field: values.timeField,
  schedule: {
    every: values.schedule.every,
    lookback: values.schedule.lookback,
  },
  evaluation: {
    query: {
      base: values.evaluation.query.base,
    },
  },
  ...(values.grouping?.fields?.length && { grouping: { fields: values.grouping.fields } }),
});

/**
 * Parse and validate YAML string to FormValues
 */
export const parseYamlToFormValues = (yamlString: string): YamlParseResult => {
  let parsed: unknown;
  try {
    parsed = load(yamlString);
  } catch (error) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.yamlSyntaxError', {
        defaultMessage: 'Invalid YAML syntax.',
      }),
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.yamlObjectError', {
        defaultMessage: 'YAML must be an object.',
      }),
    };
  }

  const obj = parsed as Record<string, unknown>;
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  const schedule = obj.schedule as Record<string, unknown> | undefined;
  const evaluation = obj.evaluation as Record<string, unknown> | undefined;
  const evalQuery = evaluation?.query as Record<string, unknown> | undefined;
  const grouping = obj.grouping as Record<string, unknown> | undefined;

  // Validate kind
  const kind = obj.kind;
  if (kind !== undefined && kind !== 'alert' && kind !== 'signal') {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.invalidKindError', {
        defaultMessage: 'Kind must be "alert" or "signal".',
      }),
    };
  }

  // Validate required fields
  const name = metadata?.name;
  if (typeof name !== 'string' || !name.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.nameRequiredError', {
        defaultMessage: 'metadata.name is required.',
      }),
    };
  }

  const queryBase = evalQuery?.base;
  if (typeof queryBase !== 'string' || !queryBase.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.queryRequiredError', {
        defaultMessage: 'evaluation.query.base is required.',
      }),
    };
  }

  // Validate ES|QL query syntax
  const queryValidationError = validateEsqlQuery(queryBase);
  if (queryValidationError) {
    return {
      values: null,
      error: queryValidationError,
    };
  }

  return {
    values: {
      kind: (kind as 'alert' | 'signal') ?? 'alert',
      metadata: {
        name: name.trim(),
        enabled: metadata?.enabled !== false,
        description: typeof metadata?.description === 'string' ? metadata.description : undefined,
        owner: typeof metadata?.owner === 'string' ? metadata.owner : undefined,
        labels: Array.isArray(metadata?.labels) ? (metadata.labels as string[]) : undefined,
      },
      timeField: typeof obj.time_field === 'string' ? obj.time_field : '@timestamp',
      schedule: {
        every: typeof schedule?.every === 'string' ? schedule.every : '5m',
        lookback: typeof schedule?.lookback === 'string' ? schedule.lookback : '1m',
      },
      evaluation: {
        query: {
          base: queryBase,
        },
      },
      grouping: Array.isArray(grouping?.fields)
        ? { fields: grouping.fields as string[] }
        : undefined,
    },
    error: null,
  };
};

/**
 * Serialize current form values to YAML string
 */
export const serializeFormToYaml = (values: FormValues): string => {
  return dump(formValuesToYamlObject(values), { lineWidth: 120, noRefs: true });
};
