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
import {
  ES_QUERY_ID,
  INDEX_THRESHOLD_ID,
  OBSERVABILITY_ALERTS_FEATURE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
} from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import { useClassicWriteAccess } from './use_classic_write_access';

jest.mock('@kbn/alerts-ui-shared', () => ({
  useGetRuleTypesPermissions: jest.fn(),
}));

const useGetRuleTypesPermissionsMock = jest.mocked(useGetRuleTypesPermissions);

const episode = (ruleTypeId?: string): AlertEpisode =>
  ({
    'episode.id': 'e1',
    source_id: 'v1',
    ...(ruleTypeId ? { source_action_context: { ruleTypeId } } : {}),
  } as AlertEpisode);

const renderWriteAccess = ({
  authorizedToCreateAnyRules = false,
  capabilities = {},
}: {
  authorizedToCreateAnyRules?: boolean;
  capabilities?: Record<string, Record<string, boolean>>;
} = {}) => {
  useGetRuleTypesPermissionsMock.mockReturnValue({
    authorizedToCreateAnyRules,
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

describe('useClassicWriteAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('withholds write without any granting privilege', () => {
    const canWrite = renderWriteAccess();

    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID))).toBe(false);
    expect(canWrite(episode(INDEX_THRESHOLD_ID))).toBe(false);
  });

  it('grants write for every rule type when the user may create rules', () => {
    const canWrite = renderWriteAccess({ authorizedToCreateAnyRules: true });

    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID))).toBe(true);
    expect(canWrite(episode(INDEX_THRESHOLD_ID))).toBe(true);
  });

  it('limits the Observability alerts write capability to its own rule types', () => {
    const canWrite = renderWriteAccess({
      capabilities: { [OBSERVABILITY_ALERTS_FEATURE_ID]: { write: true } },
    });

    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID))).toBe(true);
    expect(canWrite(episode(INDEX_THRESHOLD_ID))).toBe(false);
  });

  it('limits the Stack alerts write capability to its own rule types', () => {
    const canWrite = renderWriteAccess({
      capabilities: { [STACK_ALERTS_ONLY_FEATURE_ID]: { write: true } },
    });

    expect(canWrite(episode(INDEX_THRESHOLD_ID))).toBe(true);
    expect(canWrite(episode(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID))).toBe(false);
  });

  it('grants write on stack rule types supported by Observability to either capability', () => {
    const observability = renderWriteAccess({
      capabilities: { [OBSERVABILITY_ALERTS_FEATURE_ID]: { write: true } },
    });
    const stack = renderWriteAccess({
      capabilities: { [STACK_ALERTS_ONLY_FEATURE_ID]: { write: true } },
    });

    expect(observability(episode(ES_QUERY_ID))).toBe(true);
    expect(stack(episode(ES_QUERY_ID))).toBe(true);
  });

  it('falls back to the granted capabilities when the row has no rule type', () => {
    expect(renderWriteAccess()(episode())).toBe(false);
    expect(
      renderWriteAccess({ capabilities: { [STACK_ALERTS_ONLY_FEATURE_ID]: { write: true } } })(
        episode()
      )
    ).toBe(true);
  });
});
