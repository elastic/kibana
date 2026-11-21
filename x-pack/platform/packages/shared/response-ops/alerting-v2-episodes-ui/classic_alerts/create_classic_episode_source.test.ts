/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_RULE_TYPE_ID, ES_QUERY_ID, STACK_MANAGEMENT_RULES_HOST } from '@kbn/rule-data-utils';
import { OPEN_IN_DISCOVER_EPISODE_ACTION_ID } from '../actions/open_in_discover';
import type { AlertEpisode } from '../queries/episodes_query';
import { isDiscoverExtension, type EpisodeDataSource } from '../types/episode_data_source';
import { CLASSIC_EPISODE_SOURCE_ID } from './constants';
import { createClassicEpisodeSource } from './create_classic_episode_source';
import { useClassicWriteAccess } from './use_classic_write_access';
import type { ClassicAlertActionContext } from './utils/map_alert';
import { fetchClassicAlertById } from './apis/fetch_classic_alert_by_id';

jest.mock('./apis/fetch_classic_alert_by_id');

const fetchClassicAlertByIdMock = jest.mocked(fetchClassicAlertById);

const HOST_RULE_TYPE_ID = 'host.rule';

const makeClassicEpisode = (ruleTypeId: string): AlertEpisode => {
  const actionContext: ClassicAlertActionContext = {
    index: '.internal.alerts-stack.alerts-default-000001',
    alertUuid: 'alert-1',
    instanceId: undefined,
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
    source_id: CLASSIC_EPISODE_SOURCE_ID,
    source_action_context: actionContext,
  };
};

const getDiscoverExtension = (source: EpisodeDataSource) =>
  source.actionExtensions
    ?.filter(isDiscoverExtension)
    .find(({ actionId }) => actionId === OPEN_IN_DISCOVER_EPISODE_ACTION_ID);

describe('createClassicEpisodeSource', () => {
  it('resolves write access through the classic write access hook', () => {
    expect(createClassicEpisodeSource({ ruleTypeIds: ['test-type'] }).useWriteAccess).toBe(
      useClassicWriteAccess
    );
  });

  describe('Open in Discover', () => {
    it('opens stack rule types in Discover when no host adds link resolvers', () => {
      const extension = getDiscoverExtension(
        createClassicEpisodeSource({ ruleTypeIds: ['test-type'] })
      );

      expect(extension?.isCompatible(makeClassicEpisode(ES_QUERY_ID))).toBe(true);
      expect(extension?.isCompatible(makeClassicEpisode(HOST_RULE_TYPE_ID))).toBe(false);
    });

    it('opens rule types whose link resolvers the host adds in Discover', () => {
      const extension = getDiscoverExtension(
        createClassicEpisodeSource({
          ruleTypeIds: ['test-type'],
          discoverLinkResolvers: { [HOST_RULE_TYPE_ID]: jest.fn() },
        })
      );

      expect(extension?.isCompatible(makeClassicEpisode(HOST_RULE_TYPE_ID))).toBe(true);
      expect(extension?.isCompatible(makeClassicEpisode(ES_QUERY_ID))).toBe(true);
    });

    it('uses the host resolver over the stack resolver for the same rule type', async () => {
      const alert = { [ALERT_RULE_TYPE_ID]: ES_QUERY_ID };
      const target = { url: '/app/discover#/host' };
      const hostResolver = jest.fn(() => target);
      fetchClassicAlertByIdMock.mockResolvedValue(alert);
      const extension = getDiscoverExtension(
        createClassicEpisodeSource({
          ruleTypeIds: ['test-type'],
          discoverLinkResolvers: { [ES_QUERY_ID]: hostResolver },
        })
      );

      await expect(
        extension?.getDiscoverTarget(makeClassicEpisode(ES_QUERY_ID), {
          http: httpServiceMock.createStartContract(),
        })
      ).resolves.toEqual(target);
      expect(hostResolver).toHaveBeenCalledWith(alert);
    });
  });

  describe('getRuleDetailsHref', () => {
    it('uses the default Stack Management host when no host is provided', () => {
      const source = createClassicEpisodeSource({ ruleTypeIds: ['test-type'] });
      expect(source.getRuleDetailsHref!('rule-1')).toBe(
        `/app/${STACK_MANAGEMENT_RULES_HOST.app}${STACK_MANAGEMENT_RULES_HOST.pathPrefix}/rule/rule-1`
      );
    });

    it('uses appBasePath when the host provides one', () => {
      const source = createClassicEpisodeSource({
        ruleTypeIds: ['test-type'],
        host: {
          app: 'observabilityAlerting',
          pathPrefix: '/rules/v1',
          appBasePath: '/app/observability/alerting',
        },
      });
      expect(source.getRuleDetailsHref!('rule-1')).toBe(
        '/app/observability/alerting/rules/v1/rule/rule-1'
      );
    });

    it('falls back to /app/{appId} when appBasePath is omitted', () => {
      const source = createClassicEpisodeSource({
        ruleTypeIds: ['test-type'],
        host: { app: 'myApp', pathPrefix: '/rules' },
      });
      expect(source.getRuleDetailsHref!('rule-1')).toBe('/app/myApp/rules/rule/rule-1');
    });
  });
});
