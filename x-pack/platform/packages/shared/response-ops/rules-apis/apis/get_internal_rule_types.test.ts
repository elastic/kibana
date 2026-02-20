/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInternalRuleTypes } from './get_internal_rule_types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const http = httpServiceMock.createStartContract();

const ruleTypeResponse = {
  id: '1',
  name: 'name',
  action_groups: [
    {
      id: 'default',
      name: 'Default',
    },
  ],
  action_variables: {
    context: [],
    state: [],
  },
  alerts: [],
  authorized_consumers: {},
  category: 'test',
  default_action_group_id: 'default',
  default_schedule_interval: '10m',
  does_set_recovery_context: false,
  enabled_in_license: true,
  has_alerts_mappings: true,
  is_exportable: true,
  minimum_license_required: 'basic',
  producer: 'test',
  solution: 'stack',
  recovery_action_group: {
    id: 'recovered',
    name: 'Recovered',
  },
  rule_task_timeout: '10m',
};

const expectedRuleType = {
  id: '1',
  name: 'name',
  actionGroups: [
    {
      id: 'default',
      name: 'Default',
    },
  ],
  actionVariables: {
    context: [],
    state: [],
  },
  alerts: [],
  authorizedConsumers: {},
  category: 'test',
  defaultActionGroupId: 'default',
  defaultScheduleInterval: '10m',
  doesSetRecoveryContext: false,
  enabledInLicense: true,
  hasAlertsMappings: true,
  isExportable: true,
  minimumLicenseRequired: 'basic',
  producer: 'test',
  solution: 'stack',
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  ruleTaskTimeout: '10m',
};

describe('getInternalRuleTypes', () => {
  it('should call the internal rule types API and transform the response case', async () => {
    http.get.mockResolvedValueOnce([ruleTypeResponse]);

    const result = await getInternalRuleTypes({
      http,
    });

    expect(result).toEqual([expectedRuleType]);

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/_rule_types",
      ]
    `);
  });
});
