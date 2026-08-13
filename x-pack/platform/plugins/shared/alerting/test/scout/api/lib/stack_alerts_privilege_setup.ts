/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiClientFixture,
  RequestAuthFixture,
  RoleApiCredentials,
  SamlAuth,
} from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  COMMON_HEADERS,
  ES_QUERY_DEFAULT_INSTANCE_ID,
  ES_QUERY_DEFAULT_INSTANCE_ID_ENCODED,
  ES_QUERY_RULE_PARAMS,
} from '../fixtures/constants';
import { waitForSuccessfulEventLogEntry } from './wait_for_successful_event_log';

const INDEX_THRESHOLD_PARAMS = {
  aggType: 'count',
  termSize: 5,
  thresholdComparator: '>' as const,
  timeWindowSize: 5,
  timeWindowUnit: 'm' as const,
  groupBy: 'all' as const,
  threshold: [1000000],
  index: ['.kibana-event-log-*'],
  timeField: '@timestamp',
};

export interface RuleSpec {
  ruleTypeId: string;
  consumer: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

export const RULE_SPECS: RuleSpec[] = [
  {
    ruleTypeId: '.es-query',
    consumer: 'stackAlerts',
    params: ES_QUERY_RULE_PARAMS,
    enabled: true,
  },
  {
    ruleTypeId: '.index-threshold',
    consumer: 'stackAlerts',
    params: INDEX_THRESHOLD_PARAMS,
    enabled: false,
  },
];

export const FAKE_ALERT_INSTANCE_ID = 'fake-instance-id';

export interface StackAlertsPrivilegeState {
  adminCreds: RoleApiCredentials;
  createdRules: Array<{ ruleTypeId: string; ruleId: string }>;
  enabledRuleId: string;
  realAlertId: string;
  realAlertIndex: string;
  /** Instance id of the real, active alert that was muted during setup. */
  mutedAlertInstanceId: string;
}

export const setupStackAlertsPrivilegeTests = async (
  apiClient: ApiClientFixture,
  requestAuth: RequestAuthFixture,
  samlAuth: SamlAuth
): Promise<StackAlertsPrivilegeState> => {
  const adminCreds = await requestAuth.getApiKey('admin');
  const createdRules: Array<{ ruleTypeId: string; ruleId: string }> = [];
  let enabledRuleId: string | undefined;

  for (const spec of RULE_SPECS) {
    const response = await apiClient.post('api/alerting/rule', {
      headers: { ...COMMON_HEADERS, ...adminCreds.apiKeyHeader },
      body: {
        name: `Scout stack-alerts-priv: ${spec.ruleTypeId}`,
        rule_type_id: spec.ruleTypeId,
        consumer: spec.consumer,
        schedule: { interval: '1m' },
        enabled: spec.enabled,
        params: spec.params,
        actions: [],
        tags: ['scout-stack-alerts-priv'],
      },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);

    const ruleId = (response.body as { id: string }).id;
    createdRules.push({ ruleTypeId: spec.ruleTypeId, ruleId });
    if (spec.enabled) {
      enabledRuleId = ruleId;
    }
  }

  expect(enabledRuleId, 'expected at least one enabled rule spec').toBeDefined();

  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const adminSessionHeaders = { ...COMMON_HEADERS, ...cookieHeader };
  await waitForSuccessfulEventLogEntry(apiClient, enabledRuleId!, adminSessionHeaders);

  let realAlertId: string | undefined;
  let realAlertIndex: string | undefined;
  // Alert indexing can lag rule execution (especially on serverless), so poll the
  // alerts index until the active alert for the enabled rule becomes searchable.
  await expect
    .poll(
      async () => {
        const findResponse = await apiClient.post('internal/rac/alerts/find', {
          headers: adminSessionHeaders,
          body: {
            rule_type_ids: ['.es-query'],
            consumers: ['stackAlerts'],
            query: {
              bool: {
                filter: [
                  { term: { 'kibana.alert.rule.uuid': enabledRuleId } },
                  { term: { 'kibana.alert.status': 'active' } },
                ],
              },
            },
            size: 1,
          },
          responseType: 'json',
        });
        const alertDoc = (
          findResponse.body as { hits?: { hits?: Array<{ _id: string; _index: string }> } }
        )?.hits?.hits?.[0];
        realAlertId = alertDoc?._id;
        realAlertIndex = alertDoc?._index;
        return Boolean(alertDoc);
      },
      {
        timeout: 30_000,
        intervals: [2_000],
        message: 'expected an alert to be generated for the enabled rule',
      }
    )
    .toBe(true);

  // .es-query with groupBy: 'all' always uses this instance id (see constants.ts).
  // Mute only after the alert is indexed — validate_alerts_existence=true searches the alert index.
  const muteResponse = await apiClient.post(
    `api/alerting/rule/${enabledRuleId!}/alert/${ES_QUERY_DEFAULT_INSTANCE_ID_ENCODED}/_mute?validate_alerts_existence=true`,
    { headers: { ...COMMON_HEADERS, ...adminCreds.apiKeyHeader } }
  );
  expect(muteResponse).toHaveStatusCode(204);

  return {
    adminCreds,
    createdRules,
    enabledRuleId: enabledRuleId!,
    realAlertId: realAlertId!,
    realAlertIndex: realAlertIndex!,
    mutedAlertInstanceId: ES_QUERY_DEFAULT_INSTANCE_ID,
  };
};

export const teardownStackAlertsPrivilegeTests = async (
  apiClient: ApiClientFixture,
  state: StackAlertsPrivilegeState
) => {
  for (const { ruleId } of state.createdRules) {
    await apiClient.delete(`api/alerting/rule/${ruleId}`, {
      headers: { ...COMMON_HEADERS, ...state.adminCreds.apiKeyHeader },
    });
  }
};
