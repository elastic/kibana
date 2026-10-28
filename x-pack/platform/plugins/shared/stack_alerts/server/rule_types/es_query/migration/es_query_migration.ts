/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import type { RuleMigrationDefinition } from '@kbn/alerting-v2-migration-plugin/server';
import { convertEsQueryParams } from './convert_es_query_params';

// Liquid over the action policy workflow payload. Mirrors the classic `defaultActionMessage`:
// the query's result row (`alert.data`) stands in for `context.value` / `context.conditions`.
// Not translated: ICU message syntax conflicts with Liquid `{% %}` and `{{ }}`.
const DEFAULT_SUBJECT = `{% assign alert = inputs.payload.alerts | first %}Elasticsearch query rule '{{ inputs.payload.rules[alert.rule_id].name | default: "Alert" }}' is {{ alert.alert_status }}`;

const DEFAULT_MESSAGE = `{% for alert in inputs.payload.alerts %}Elasticsearch query rule '{{ inputs.payload.rules[alert.rule_id].name | default: "Alert" }}' is {{ alert.alert_status }}:

{% for field in alert.data %}- {{ field[0] }}: '{{ field[1] }}'
{% endfor %}- Timestamp: '{{ alert.last_event_timestamp }}'
- Link: '{{ alert.alert_url }}'
{% endfor %}`;

export const esQueryRuleMigration: RuleMigrationDefinition = {
  ruleTypeId: ES_QUERY_ID,
  convertParams: convertEsQueryParams,
  defaultActionPolicy: {
    subject: DEFAULT_SUBJECT,
    message: DEFAULT_MESSAGE,
  },
};
