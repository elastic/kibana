/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTO_GENERATED_TAG } from '../cases_generator/utils';

/**
 * The alias of the stack alerts of the default space. A demo alert carries its own space in `kibana.space_ids`.
 */
export const DEMO_ALERTS_INDEX = '.alerts-stack.alerts-default';

/**
 * The demo marker: only the alerts with this rule name and this rule tag are demo alerts.
 */
export const DEMO_ALERT_RULE_NAME = 'KPI demo rule';
export const DEMO_ALERT_RULE_TAG = AUTO_GENERATED_TAG;
export const DEMO_ALERT_RULE_UUID = 'kpi-demo-rule';

/**
 * Builds one recovered stack alert of the demo rule. The backdate script sets the real times later.
 */
export const buildDemoAlert = ({
  uuid,
  space,
  timestamp,
}: {
  uuid: string;
  space: string;
  timestamp: string;
}): Record<string, unknown> => ({
  '@timestamp': timestamp,
  'event.kind': 'signal',
  'event.action': 'close',
  'kibana.alert.uuid': uuid,
  'kibana.alert.instance.id': uuid,
  'kibana.alert.status': 'recovered',
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.action_group': 'recovered',
  'kibana.alert.flapping': false,
  'kibana.alert.start': timestamp,
  'kibana.alert.reason': 'A KPI demo alert for the case list metrics',
  'kibana.alert.rule.name': DEMO_ALERT_RULE_NAME,
  'kibana.alert.rule.uuid': DEMO_ALERT_RULE_UUID,
  'kibana.alert.rule.rule_type_id': '.es-query',
  'kibana.alert.rule.consumer': 'stackAlerts',
  'kibana.alert.rule.producer': 'stackAlerts',
  'kibana.alert.rule.category': 'Elasticsearch query',
  'kibana.alert.rule.tags': [DEMO_ALERT_RULE_TAG],
  'kibana.alert.rule.revision': 0,
  'kibana.alert.case_ids': [],
  'kibana.space_ids': [space],
  tags: [DEMO_ALERT_RULE_TAG],
});
