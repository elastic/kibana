/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { ES_QUERY_ID, STACK_MANAGEMENT_RULES_HOST } from '@kbn/rule-data-utils';
import type { EpisodeActionsDeps } from '../actions/create_episode_actions';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeDataSource } from '../types/episode_data_source';
import type { DataViewDiscoverLocatorParams } from '../utils/discover_href_for_alert';
import { CLASSIC_EPISODE_SOURCE_ID } from './constants';
import { createClassicEpisodeSource } from './create_classic_episode_source';
import { CLASSIC_OPEN_IN_DISCOVER_ACTION_ID } from './open_in_discover';
import { useClassicWriteAccess } from './use_classic_write_access';
import type { ClassicAlertActionContext } from './utils/map_alert';

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

const getOpenInDiscoverAction = (
  source: EpisodeDataSource,
  additionalDataSource: EpisodeDataSource
) => {
  const deps = {
    http: httpServiceMock.createStartContract(),
    application: applicationServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    discoverLocator: sharePluginMock.createLocator<DataViewDiscoverLocatorParams>(),
    additionalDataSource,
  } as unknown as EpisodeActionsDeps;

  return (source.createActions?.(deps) ?? []).find(
    ({ id }) => id === CLASSIC_OPEN_IN_DISCOVER_ACTION_ID
  );
};

describe('createClassicEpisodeSource', () => {
  it('resolves write access through the classic write access hook', () => {
    expect(createClassicEpisodeSource({ ruleTypeIds: ['test-type'] }).useWriteAccess).toBe(
      useClassicWriteAccess
    );
  });

  describe('Open in Discover action', () => {
    const source = createClassicEpisodeSource({ ruleTypeIds: ['test-type'] });

    it('is offered for stack rule types when no host adds link resolvers', () => {
      const action = getOpenInDiscoverAction(source, source);

      expect(action?.isCompatible({ episodes: [makeClassicEpisode(ES_QUERY_ID)] })).toBe(true);
      expect(action?.isCompatible({ episodes: [makeClassicEpisode(HOST_RULE_TYPE_ID)] })).toBe(
        false
      );
    });

    it('is offered for rule types whose link resolvers the host merged into the source', () => {
      const mergedSource: EpisodeDataSource = {
        ...source,
        discoverLinkResolvers: {
          ...source.discoverLinkResolvers,
          [HOST_RULE_TYPE_ID]: jest.fn(),
        },
      };
      const action = getOpenInDiscoverAction(source, mergedSource);

      expect(action?.isCompatible({ episodes: [makeClassicEpisode(HOST_RULE_TYPE_ID)] })).toBe(
        true
      );
      expect(action?.isCompatible({ episodes: [makeClassicEpisode(ES_QUERY_ID)] })).toBe(true);
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
