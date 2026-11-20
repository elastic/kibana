/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KpiMetricRequest, KpiMetricsConfigurationRequest } from '../../../common/types/api';
import type {
  CustomFieldsConfiguration,
  CustomFieldTypes,
  TemplatesConfiguration,
} from '../../../common/types/domain';
import { validateDuplicatedKeysInRequest } from '../validators';
import {
  validateCustomFieldKeysAgainstConfiguration,
  validateCustomFieldTypesInRequest as validateCaseCustomFieldTypesInRequest,
} from '../cases/validators';
import {
  getKpiMetricFieldError,
  getKpiMetricQueryError,
  isAlertTimeToAcknowledgeMetric,
} from '../metrics/kpi';

/**
 * Throws an error if the request tries to change the type of existing custom fields.
 */
export const validateCustomFieldTypesInRequest = ({
  requestCustomFields,
  originalCustomFields,
}: {
  requestCustomFields?: Array<{ key: string; type: CustomFieldTypes; label: string }>;
  originalCustomFields: Array<{ key: string; type: CustomFieldTypes }>;
}) => {
  if (!Array.isArray(requestCustomFields) || !originalCustomFields.length) {
    return;
  }

  const invalidFields: string[] = [];

  requestCustomFields.forEach((requestField) => {
    const originalField = originalCustomFields.find((item) => item.key === requestField.key);

    if (originalField && originalField.type !== requestField.type) {
      invalidFields.push(`"${requestField.label}"`);
    }
  });

  if (invalidFields.length > 0) {
    throw Boom.badRequest(
      `Invalid custom field types in request for the following labels: ${invalidFields.join(', ')}`
    );
  }
};

export const validateTemplatesCustomFieldsInRequest = ({
  templates,
  customFieldsConfiguration,
}: {
  templates?: TemplatesConfiguration;
  customFieldsConfiguration?: CustomFieldsConfiguration;
}) => {
  if (!Array.isArray(templates) || !templates.length) {
    return;
  }

  templates.forEach((template, index) => {
    if (customFieldsConfiguration === undefined && template.caseFields?.customFields?.length) {
      throw Boom.badRequest('No custom fields configured.');
    }

    if (
      (!template.caseFields ||
        !template.caseFields.customFields ||
        !template.caseFields.customFields.length) &&
      customFieldsConfiguration?.length
    ) {
      throw Boom.badRequest('No custom fields added to template.');
    }

    const params = {
      requestCustomFields: template?.caseFields?.customFields,
      customFieldsConfiguration,
    };

    validateDuplicatedKeysInRequest({
      requestFields: params.requestCustomFields,
      fieldName: `templates[${index}]'s customFields`,
    });
    validateCustomFieldKeysAgainstConfiguration(params);
    validateCaseCustomFieldTypesInRequest(params);
  });
};

const ALERT_METRIC_OPTIONS = [
  'acknowledgeTrigger',
  'aggregateBy',
  'dateBasis',
  'caseQuery',
] as const;

const getPredefinedOptionErrors = (
  metric: Extract<KpiMetricRequest, { kind: 'predefined' }>
): string[] => {
  const options = ALERT_METRIC_OPTIONS.filter((option) => metric[option] != null);

  if (options.length === 0) {
    return [];
  }

  if (!isAlertTimeToAcknowledgeMetric(metric.predefinedId)) {
    return [
      `The options ${options.join(', ')} are only for the alert time to acknowledge metrics.`,
    ];
  }

  const queryError =
    metric.caseQuery != null ? getKpiMetricQueryError(metric.caseQuery) : undefined;

  return queryError != null ? [queryError] : [];
};

/**
 * Throws an error if a page has duplicated metric ids, or if a custom KPI metric has a KQL syntax error
 * or a field that the catalog does not allow. Also throws if an alert metric option is on another metric,
 * or if the case query of an alert metric has a KQL syntax error.
 */
export const validateKpiMetricsInRequest = ({
  metrics,
}: {
  metrics?: KpiMetricsConfigurationRequest;
}) => {
  if (metrics == null) {
    return;
  }

  (['casesList', 'caseDetails'] as const).forEach((page) => {
    validateDuplicatedKeysInRequest({
      requestFields: metrics[page]?.flatMap(({ id }) => (id != null ? [{ key: id }] : [])),
      fieldName: `metrics.${page}`,
    });
  });

  const errors = [...(metrics.casesList ?? []), ...(metrics.caseDetails ?? [])].flatMap(
    (metric) => {
      if (metric.kind === 'predefined') {
        return getPredefinedOptionErrors(metric).map(
          (error) => `"${metric.predefinedId}": ${error}`
        );
      }

      return [getKpiMetricQueryError(metric.query), getKpiMetricFieldError(metric)]
        .filter((error): error is string => error != null)
        .map((error) => `"${metric.label}": ${error}`);
    }
  );

  if (errors.length > 0) {
    throw Boom.badRequest(`Invalid KPI metrics in request: ${errors.join(' ')}`);
  }
};
