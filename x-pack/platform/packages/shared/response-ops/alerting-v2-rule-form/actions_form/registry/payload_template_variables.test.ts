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
import { INLINE_ACTION_STEP_DEFINITIONS } from './registry';

const TEMPLATE_VARIABLE = /{{\s*([\w.[\]]+)/g;

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

  it('marks alert fields the schema does not require as optional', () => {
    const variable = getPayloadTemplateVariables().find(({ name }) => name === 'alert.severity');

    expect(variable?.description).toContain('Severity of the alert (optional)');
  });

  it('lists rule metadata fields keyed by the alert rule id', () => {
    const names = getPayloadTemplateVariables().map(({ name }) => name);

    expect(names).toContain('inputs.payload.rules[alert.rule_id].name');
  });

  it.each(INLINE_ACTION_STEP_DEFINITIONS.map(({ id, paramsTemplate }) => [id, paramsTemplate]))(
    'lists every variable the default %s template references',
    (_, paramsTemplate) => {
      const names = getPayloadTemplateVariables().map(({ name }) => name);
      const referenced = [...paramsTemplate.matchAll(TEMPLATE_VARIABLE)].map(([, name]) => name);

      expect(referenced.length).toBeGreaterThan(0);
      expect(names).toEqual(expect.arrayContaining(referenced));
    }
  );

  it('carries the schema description for each top-level field', () => {
    const variable = getPayloadTemplateVariables().find(
      ({ name }) => name === 'inputs.payload.policyId'
    );

    expect(variable?.description).toBe(schema?.properties?.policyId?.description);
  });
});
