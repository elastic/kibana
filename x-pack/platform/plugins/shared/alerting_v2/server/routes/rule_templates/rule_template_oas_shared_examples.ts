/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorResponse, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import { getRuleTemplateNotFoundMessage } from '../../lib/errors/rule_template_error_messages';
import type { OasExampleEntry } from '../oas_types';

export const RULE_TEMPLATE_RESPONSE: RuleTemplateResponse = {
  id: 'nginx-error-rate',
  engine: 'v2',
  rule: {
    kind: 'alert',
    metadata: {
      name: 'Nginx error rate high',
      description: 'Alerts when the share of 5xx responses exceeds a threshold.',
      tags: ['nginx', 'observability'],
    },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    recovery_strategy: 'no_breach',
    query: {
      format: 'standalone',
      breach: {
        query:
          'FROM logs-nginx.access-* | STATS errors = COUNT(*) WHERE http.response.status_code >= 500, total = COUNT(*) BY host.name | WHERE errors * 100 / total > 5',
      },
    },
    grouping: { fields: ['host.name'] },
    state_transition: { pending_count: 1, recovering_count: 1 },
  },
};

/** Shared 404 body for the single-rule-template route. */
export const RULE_TEMPLATE_NOT_FOUND_RESPONSE: OasExampleEntry = {
  name: 'ruleTemplateNotFound',
  summary: 'No alerting v2 rule template exists for the given ID',
  value: {
    code: ALERTING_V2_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND,
    error: 'Not Found',
    message: getRuleTemplateNotFoundMessage(RULE_TEMPLATE_RESPONSE.id),
    details: { rule_template_id: RULE_TEMPLATE_RESPONSE.id },
  } satisfies ErrorResponse,
};
