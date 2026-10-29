/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
} from '@kbn/workflows';
import { getPayloadTemplateVariables } from './payload_template_variables';

describe('getPayloadTemplateVariables', () => {
  const schema =
    builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];

  it('lists every top-level payload field from the schema under inputs.payload', () => {
    const names = getPayloadTemplateVariables().map(({ name }) => name);

    for (const key of Object.keys(schema?.properties ?? {})) {
      expect(names).toContain(`inputs.payload.${key}`);
    }
  });

  it('lists alert fields as alert.<field> for use inside the alerts loop', () => {
    const variable = getPayloadTemplateVariables().find(({ name }) => name === 'alert.alert_url');

    expect(variable?.description).toContain(
      'Absolute URL of the alert details page in Kibana, in the alert space'
    );
    expect(variable?.description).toContain('{% for alert in inputs.payload.alerts %}');
  });

  it('lists rule metadata fields keyed by the alert rule id', () => {
    const names = getPayloadTemplateVariables().map(({ name }) => name);

    expect(names).toContain('inputs.payload.rules[alert.rule_id].name');
  });

  it('carries the schema description for each top-level field', () => {
    const variable = getPayloadTemplateVariables().find(
      ({ name }) => name === 'inputs.payload.policyId'
    );

    expect(variable?.description).toBe(schema?.properties?.policyId?.description);
  });
});
