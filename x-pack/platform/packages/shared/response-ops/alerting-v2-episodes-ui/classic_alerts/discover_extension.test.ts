/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  ALERT_RULE_TYPE_ID,
  ApmRuleType,
  ES_QUERY_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import type { AlertDiscoverLinkResolver } from '../utils/discover_href_for_alert';
import { OPEN_IN_DISCOVER_EPISODE_ACTION_ID } from '../actions/open_in_discover';
import type { ClassicAlertActionContext } from './utils/map_alert';
import { STACK_DISCOVER_LINK_RESOLVERS } from './utils/get_classic_alert_discover_target';
import { fetchClassicAlertById } from './apis/fetch_classic_alert_by_id';
import { createClassicDiscoverExtension } from './discover_extension';

jest.mock('./apis/fetch_classic_alert_by_id');

const fetchClassicAlertByIdMock = jest.mocked(fetchClassicAlertById);

const RULE_TYPE_IDS = [LOG_THRESHOLD_ALERT_TYPE_ID, ES_QUERY_ID];

const hostResolver = jest.fn<
  ReturnType<AlertDiscoverLinkResolver>,
  Parameters<AlertDiscoverLinkResolver>
>();
const RESOLVERS = { ...STACK_DISCOVER_LINK_RESOLVERS, [LOG_THRESHOLD_ALERT_TYPE_ID]: hostResolver };

const makeEpisode = (ruleTypeId: string = LOG_THRESHOLD_ALERT_TYPE_ID): AlertEpisode => {
  const actionContext: ClassicAlertActionContext = {
    index: '.internal.alerts-observability.logs.alerts-default-000001',
    alertUuid: 'alert-1',
    instanceId: 'host-1',
    ruleId: 'rule-1',
    ruleTypeId,
    workflowStatus: 'open',
    workflowTags: [],
    caseIds: [],
  };

  return {
    '@timestamp': '2026-11-20T10:05:00.000Z',
    'episode.id': 'alert-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'alert-1',
    first_timestamp: '2026-11-20T10:00:00.000Z',
    last_timestamp: '2026-11-20T10:05:00.000Z',
    duration: 300000,
    supports_actions: false,
    source_id: 'v1',
    source_action_context: actionContext,
  };
};

describe('createClassicDiscoverExtension', () => {
  const extension = createClassicDiscoverExtension({
    ruleTypeIds: RULE_TYPE_IDS,
    resolvers: RESOLVERS,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends the platform Open in Discover action', () => {
    expect(extension.actionId).toBe(OPEN_IN_DISCOVER_EPISODE_ACTION_ID);
  });

  describe('isCompatible', () => {
    it('is compatible with rule types that have a resolver', () => {
      expect(extension.isCompatible(makeEpisode())).toBe(true);
      expect(extension.isCompatible(makeEpisode(ES_QUERY_ID))).toBe(true);
    });

    it('is not compatible with rule types without a resolver', () => {
      expect(extension.isCompatible(makeEpisode(ApmRuleType.ErrorCount))).toBe(false);
    });
  });

  describe('getDiscoverTarget', () => {
    it('resolves the target from the alert document through the rule type resolver', async () => {
      const http = httpServiceMock.createStartContract();
      const alert = { [ALERT_RULE_TYPE_ID]: LOG_THRESHOLD_ALERT_TYPE_ID };
      const target = { url: '/app/discover#/logs' };
      fetchClassicAlertByIdMock.mockResolvedValue(alert);
      hostResolver.mockReturnValue(target);

      await expect(extension.getDiscoverTarget(makeEpisode(), { http })).resolves.toEqual(target);
      expect(fetchClassicAlertByIdMock).toHaveBeenCalledWith({
        ruleTypeIds: RULE_TYPE_IDS,
        id: 'alert-1',
        services: { http },
      });
      expect(hostResolver).toHaveBeenCalledWith(alert);
    });

    it('rejects when the alert cannot be fetched', async () => {
      fetchClassicAlertByIdMock.mockRejectedValue(new Error('Classic alert not found: alert-1'));

      await expect(
        extension.getDiscoverTarget(makeEpisode(), {
          http: httpServiceMock.createStartContract(),
        })
      ).rejects.toThrow('Classic alert not found: alert-1');
    });
  });
});
