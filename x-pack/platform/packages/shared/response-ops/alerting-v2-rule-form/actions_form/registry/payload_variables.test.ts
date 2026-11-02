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
import { getContextVariables } from './payload_variables';

const notificationGroupSchema =
  builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];

describe('getContextVariables', () => {
  it('lists the inline workflow trigger inputs, resolving their $ref', () => {
    expect(getContextVariables(['inputs'])).toEqual([
      {
        path: 'payload',
        detail: 'object',
        documentation: notificationGroupSchema?.description,
      },
    ]);
  });

  it('lists the payload fields from the referenced notification group schema', () => {
    const paths = getContextVariables(['inputs', 'payload']).map(({ path }) => path);

    expect(paths).toEqual(Object.keys(notificationGroupSchema?.properties ?? {}));
  });

  it('lists alert fields for any alerts index and flags optional ones', () => {
    const fields = getContextVariables(['inputs', 'payload', 'alerts', '3']);

    expect(fields.find(({ path }) => path === 'alert_url')).toEqual({
      path: 'alert_url',
      detail: 'string',
      documentation: 'Absolute URL of the alert details page in Kibana, in the alert space',
    });
    expect(fields.find(({ path }) => path === 'severity')).toEqual({
      path: 'severity',
      detail: "'info' | 'low' | 'medium' | 'high' | 'critical'",
      documentation: 'Severity of the alert (optional)',
    });
    expect(fields.find(({ path }) => path === 'rule_id')?.detail).toBe('string | null');
  });

  it('describes array fields by their item type', () => {
    const alerts = getContextVariables(['inputs', 'payload']).find(({ path }) => path === 'alerts');

    expect(alerts?.detail).toBe('object[]');
  });

  it('lists rule fields for any key of the rules map', () => {
    expect(getContextVariables(['inputs', 'payload', 'rules', 'rule-1'])).toEqual([
      { path: 'name', detail: 'string', documentation: 'Display name of the rule' },
    ]);
  });

  it.each([
    [['inputs', 'payload', 'episodes']],
    [['inputs', 'payload', 'groupKey']],
    [['inputs', 'payload', 'alerts', '0', 'data']],
    [['inputs', 'payload', 'constructor']],
    [['alert']],
  ])('returns no variables for %j', (path) => {
    expect(getContextVariables(path)).toEqual([]);
  });
});
