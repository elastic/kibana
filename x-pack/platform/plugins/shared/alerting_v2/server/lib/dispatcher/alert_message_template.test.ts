/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowLiquidEngine } from '@kbn/workflows';
import { buildAlertDetailsUrl } from './alert_details_url';
import { MOCK_KIBANA_BASE_URL } from './fixtures/test_utils';

const template = `{% for alert in inputs.payload.alerts %}
- {{ inputs.payload.rules[alert.rule_id].name | default: "Alert" }} ({{ alert.alert_status }}): {{ alert.alert_url }}
{% endfor %}
`;

describe('action policy message template', () => {
  const engine = createWorkflowLiquidEngine({ strictFilters: true, strictVariables: false });

  const toPayloadAlert = (alert: {
    alert_id: string;
    rule_id: string;
    space_id: string;
    alert_status: string;
  }) => ({
    ...alert,
    alert_url: buildAlertDetailsUrl({
      baseUrl: MOCK_KIBANA_BASE_URL,
      spaceId: alert.space_id,
      alertId: alert.alert_id,
    }),
  });

  const payload = {
    id: 'action-group-1',
    policyId: 'policy-1',
    groupKey: {},
    alerts: [
      { alert_id: 'ep-1', rule_id: 'rule-1', space_id: 'default', alert_status: 'active' },
      { alert_id: 'ep-2', rule_id: 'rule-2', space_id: 'team-a', alert_status: 'recovering' },
      { alert_id: 'ep-3', rule_id: 'rule-missing', space_id: 'default', alert_status: 'active' },
    ].map(toPayloadAlert),
    rules: {
      'rule-1': { name: 'CPU spike monitor' },
      'rule-2': { name: 'Disk usage' },
    },
  };

  it('renders each alert with a link to its details page', () => {
    expect(engine.parseAndRenderSync(template, { inputs: { payload } })).toMatchInlineSnapshot(`
      "
      - CPU spike monitor (active): https://kibana.example.com/app/observability/alerting/alerts/ep-1

      - Disk usage (recovering): https://kibana.example.com/s/team-a/app/observability/alerting/alerts/ep-2

      - Alert (active): https://kibana.example.com/app/observability/alerting/alerts/ep-3

      "
    `);
  });
});
