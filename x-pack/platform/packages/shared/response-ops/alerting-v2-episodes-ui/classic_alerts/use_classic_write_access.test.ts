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
  OBSERVABILITY_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
} from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import { useClassicWriteAccess } from './use_classic_write_access';

jest.mock('@kbn/alerts-ui-shared', () => ({
  useGetRuleTypesPermissions: jest.fn(),
}));

const useGetRuleTypesPermissionsMock = jest.mocked(useGetRuleTypesPermissions);

const episode = (ruleTypeId: string): AlertEpisode =>
  ({
    'episode.id': 'e1',
    source_id: 'v1',
    source_action_context: { ruleTypeId },
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

  it('withholds write without rule privileges or an alerts write capability', () => {
    const canWrite = renderWriteAccess();

    expect(canWrite(episode('apm.error_rate'))).toBe(false);
  });

  it('grants write on every row when the user may create any rule', () => {
    const canWrite = renderWriteAccess({ authorizedToCreateAnyRules: true });

    expect(canWrite(episode('apm.error_rate'))).toBe(true);
    expect(canWrite(episode('.index-threshold'))).toBe(true);
  });

  it.each([OBSERVABILITY_ALERTS_FEATURE_ID, STACK_ALERTS_ONLY_FEATURE_ID])(
    'grants write on every row from the %s write capability',
    (featureId) => {
      const canWrite = renderWriteAccess({ capabilities: { [featureId]: { write: true } } });

      expect(canWrite(episode('apm.error_rate'))).toBe(true);
      expect(canWrite(episode('.index-threshold'))).toBe(true);
    }
  );
});
