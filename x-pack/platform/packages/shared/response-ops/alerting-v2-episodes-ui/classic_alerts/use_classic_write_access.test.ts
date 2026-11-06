/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import type { RuleTypeWithDescription } from '@kbn/triggers-actions-ui-types';
import {
  AlertConsumers,
  ES_QUERY_ID,
  INDEX_THRESHOLD_ID,
  OBSERVABILITY_ALERTS_FEATURE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  STACK_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
} from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import { useClassicWriteAccess } from './use_classic_write_access';

jest.mock('@kbn/alerts-ui-shared', () => ({
  useGetRuleTypesPermissions: jest.fn(),
}));

const useGetRuleTypesPermissionsMock = jest.mocked(useGetRuleTypesPermissions);

const episode = (ruleTypeId?: string, consumer?: string): AlertEpisode =>
  ({
    'episode.id': 'e1',
    source_id: 'v1',
    source_action_context: { ruleTypeId, consumer },
  } as AlertEpisode);

const renderWriteAccess = ({
  authorizedConsumers = {},
  capabilities = {},
}: {
  authorizedConsumers?: Record<string, Record<string, { read: boolean; all: boolean }>>;
  capabilities?: Record<string, Record<string, boolean>>;
} = {}) => {
  const ruleTypes = new Map<string, RuleTypeWithDescription>(
    Object.entries(authorizedConsumers).map(([ruleTypeId, consumers]) => [
      ruleTypeId,
      { id: ruleTypeId, authorizedConsumers: consumers } as RuleTypeWithDescription,
    ])
  );
  useGetRuleTypesPermissionsMock.mockReturnValue({
    ruleTypesState: { data: ruleTypes },
  } as ReturnType<typeof useGetRuleTypesPermissions>);

  const application = applicationServiceMock.createStartContract();
  Object.assign(application.capabilities, capabilities);

  return renderHook(() =>
    useClassicWriteAccess({
      application,
      http: httpServiceMock.createStartContract(),
      notifications: notificationServiceMock.createStartContract(),
    })
  ).result.current;
};

const granted = { read: true, all: true };
const readOnly = { read: true, all: false };

describe('useClassicWriteAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('withholds write without any granting privilege', () => {
    const canWrite = renderWriteAccess();

    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID, AlertConsumers.LOGS))).toBe(
      false
    );
    expect(canWrite(episode(INDEX_THRESHOLD_ID, STACK_ALERTS_FEATURE_ID))).toBe(false);
  });

  it('withholds write when the row has no rule type or consumer', () => {
    const canWrite = renderWriteAccess({
      capabilities: { [STACK_ALERTS_ONLY_FEATURE_ID]: { write: true } },
    });

    expect(canWrite(episode(undefined, STACK_ALERTS_FEATURE_ID))).toBe(false);
    expect(canWrite(episode(INDEX_THRESHOLD_ID, undefined))).toBe(false);
  });

  it('grants write from rule privileges on the rule type and consumer of the row', () => {
    const canWrite = renderWriteAccess({
      authorizedConsumers: {
        [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: { [AlertConsumers.LOGS]: granted },
        [INDEX_THRESHOLD_ID]: { [STACK_ALERTS_FEATURE_ID]: readOnly },
      },
    });

    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID, AlertConsumers.LOGS))).toBe(true);
    expect(canWrite(episode(INDEX_THRESHOLD_ID, STACK_ALERTS_FEATURE_ID))).toBe(false);
  });

  it('does not spread rule privileges of one rule type across the other rows', () => {
    const canWrite = renderWriteAccess({
      authorizedConsumers: { [ES_QUERY_ID]: { [AlertConsumers.LOGS]: granted } },
    });

    expect(canWrite(episode(ES_QUERY_ID, AlertConsumers.LOGS))).toBe(true);
    expect(canWrite(episode(ES_QUERY_ID, STACK_ALERTS_FEATURE_ID))).toBe(false);
    expect(canWrite(episode(INDEX_THRESHOLD_ID, STACK_ALERTS_FEATURE_ID))).toBe(false);
  });

  it('limits the Observability alerts write capability to the combinations it grants', () => {
    const canWrite = renderWriteAccess({
      capabilities: { [OBSERVABILITY_ALERTS_FEATURE_ID]: { write: true } },
    });

    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID, AlertConsumers.LOGS))).toBe(true);
    expect(canWrite(episode(ES_QUERY_ID, AlertConsumers.INFRASTRUCTURE))).toBe(true);
    expect(canWrite(episode(INDEX_THRESHOLD_ID, STACK_ALERTS_FEATURE_ID))).toBe(false);
    expect(canWrite(episode(ES_QUERY_ID, STACK_ALERTS_FEATURE_ID))).toBe(false);
  });

  it('limits the Stack alerts write capability to the combinations it grants', () => {
    const canWrite = renderWriteAccess({
      capabilities: { [STACK_ALERTS_ONLY_FEATURE_ID]: { write: true } },
    });

    expect(canWrite(episode(INDEX_THRESHOLD_ID, STACK_ALERTS_FEATURE_ID))).toBe(true);
    expect(canWrite(episode(ES_QUERY_ID, AlertConsumers.DISCOVER))).toBe(true);
    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID, STACK_ALERTS_FEATURE_ID))).toBe(
      true
    );
    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID, AlertConsumers.LOGS))).toBe(
      false
    );
  });
});
