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
import type {
  AlertDiscoverLinkResolver,
  DataViewDiscoverLocatorParams,
} from '../utils/discover_href_for_alert';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  ALERT_RULE_TYPE_ID,
  ALERT_URL,
  ApmRuleType,
  ES_QUERY_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { AlertEpisode } from '../queries/episodes_query';
import { OPEN_IN_DISCOVER_ERROR, OPEN_IN_DISCOVER_UNAVAILABLE } from '../actions/translations';
import type { ClassicAlertActionContext } from './utils/map_alert';
import { STACK_DISCOVER_LINK_RESOLVERS } from './utils/get_classic_alert_discover_target';
import { fetchClassicAlertById } from './apis/fetch_classic_alert_by_id';
import { createClassicOpenInDiscoverAction } from './open_in_discover';

jest.mock('./apis/fetch_classic_alert_by_id');

const fetchClassicAlertByIdMock = jest.mocked(fetchClassicAlertById);

const RULE_TYPE_IDS = [LOG_THRESHOLD_ALERT_TYPE_ID, ES_QUERY_ID];
const LOCATOR_URL = '/app/r?l=DISCOVER_APP_LOCATOR';

const hostResolver = jest.fn<
  ReturnType<AlertDiscoverLinkResolver>,
  Parameters<AlertDiscoverLinkResolver>
>();
const RESOLVERS = { ...STACK_DISCOVER_LINK_RESOLVERS, [LOG_THRESHOLD_ALERT_TYPE_ID]: hostResolver };

const makeEpisode = ({
  ruleTypeId = LOG_THRESHOLD_ALERT_TYPE_ID,
  sourceId = 'v1',
}: { ruleTypeId?: string; sourceId?: string } = {}): AlertEpisode => {
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
    source_id: sourceId,
    source_action_context: actionContext,
  };
};

const makeDeps = () => {
  const discoverLocator = sharePluginMock.createLocator<DataViewDiscoverLocatorParams>();
  discoverLocator.getRedirectUrl.mockReturnValue(LOCATOR_URL);

  return {
    ruleTypeIds: RULE_TYPE_IDS,
    resolvers: RESOLVERS,
    http: httpServiceMock.createStartContract(),
    application: applicationServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    discoverLocator,
  };
};

describe('createClassicOpenInDiscoverAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCompatible', () => {
    it('is compatible with a single classic alert whose rule type has a resolver', () => {
      const action = createClassicOpenInDiscoverAction(makeDeps());

      expect(action.isCompatible({ episodes: [makeEpisode()] })).toBe(true);
    });

    it('is not compatible with a multi-selection', () => {
      const action = createClassicOpenInDiscoverAction(makeDeps());

      expect(action.isCompatible({ episodes: [makeEpisode(), makeEpisode()] })).toBe(false);
    });

    it('is not compatible with native episodes', () => {
      const action = createClassicOpenInDiscoverAction(makeDeps());
      const { source_id: _sourceId, ...nativeEpisode } = makeEpisode();

      expect(action.isCompatible({ episodes: [nativeEpisode] })).toBe(false);
    });

    it('is not compatible with rule types without a resolver', () => {
      const action = createClassicOpenInDiscoverAction(makeDeps());

      expect(
        action.isCompatible({ episodes: [makeEpisode({ ruleTypeId: ApmRuleType.ErrorCount })] })
      ).toBe(false);
    });

    it('is not compatible when the user cannot open Discover', () => {
      const action = createClassicOpenInDiscoverAction({
        ...makeDeps(),
        discoverLocator: undefined,
      });

      expect(action.isCompatible({ episodes: [makeEpisode()] })).toBe(false);
    });
  });

  describe('execute', () => {
    it('opens a classic Discover view around the alert start', async () => {
      const deps = makeDeps();
      const alert = { [ALERT_RULE_TYPE_ID]: LOG_THRESHOLD_ALERT_TYPE_ID };
      fetchClassicAlertByIdMock.mockResolvedValue(alert);
      hostResolver.mockReturnValue({
        locatorParams: {
          dataViewSpec: { title: 'logs-*', timeFieldName: '@timestamp' },
          filters: [],
        },
      });

      await createClassicOpenInDiscoverAction(deps).execute({ episodes: [makeEpisode()] });

      expect(fetchClassicAlertByIdMock).toHaveBeenCalledWith({
        ruleTypeIds: RULE_TYPE_IDS,
        id: 'alert-1',
        services: { http: deps.http },
      });
      expect(hostResolver).toHaveBeenCalledWith(alert);
      expect(deps.discoverLocator.getRedirectUrl).toHaveBeenCalledWith({
        dataViewSpec: { title: 'logs-*', timeFieldName: '@timestamp' },
        filters: [],
        timeRange: { from: '2026-11-20T09:45:00.000Z', to: '2026-11-20T10:15:00.000Z' },
      });
      expect(deps.application.navigateToUrl).toHaveBeenCalledWith(LOCATOR_URL);
    });

    it('keeps the time range a resolver provides', async () => {
      const deps = makeDeps();
      const timeRange = { from: '2026-11-20T09:00:00.000Z', to: '2026-11-20T10:05:00.000Z' };
      fetchClassicAlertByIdMock.mockResolvedValue({
        [ALERT_RULE_TYPE_ID]: LOG_THRESHOLD_ALERT_TYPE_ID,
      });
      hostResolver.mockReturnValue({
        locatorParams: {
          dataViewSpec: { title: 'logs-*', timeFieldName: '@timestamp' },
          filters: [],
          timeRange,
        },
      });

      await createClassicOpenInDiscoverAction(deps).execute({ episodes: [makeEpisode()] });

      expect(deps.discoverLocator.getRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({ timeRange })
      );
    });

    it('opens the link stored by the ES query rule without building a new one', async () => {
      const deps = makeDeps();
      fetchClassicAlertByIdMock.mockResolvedValue({
        [ALERT_RULE_TYPE_ID]: ES_QUERY_ID,
        [ALERT_URL]: '/s/default/app/r?l=STORED',
      });

      await createClassicOpenInDiscoverAction(deps).execute({
        episodes: [makeEpisode({ ruleTypeId: ES_QUERY_ID })],
      });

      expect(deps.discoverLocator.getRedirectUrl).not.toHaveBeenCalled();
      expect(deps.application.navigateToUrl).toHaveBeenCalledWith('/s/default/app/r?l=STORED');
    });

    it('shows a warning when the alert has no Discover target', async () => {
      const deps = makeDeps();
      fetchClassicAlertByIdMock.mockResolvedValue({
        [ALERT_RULE_TYPE_ID]: LOG_THRESHOLD_ALERT_TYPE_ID,
      });
      hostResolver.mockReturnValue(undefined);

      await createClassicOpenInDiscoverAction(deps).execute({ episodes: [makeEpisode()] });

      expect(deps.notifications.toasts.addWarning).toHaveBeenCalledWith(
        OPEN_IN_DISCOVER_UNAVAILABLE
      );
      expect(deps.notifications.toasts.addDanger).not.toHaveBeenCalled();
      expect(deps.application.navigateToUrl).not.toHaveBeenCalled();
    });

    it('shows the underlying error when the alert cannot be fetched', async () => {
      const deps = makeDeps();
      fetchClassicAlertByIdMock.mockRejectedValue(new Error('Classic alert not found: alert-1'));

      await createClassicOpenInDiscoverAction(deps).execute({ episodes: [makeEpisode()] });

      expect(deps.notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: OPEN_IN_DISCOVER_ERROR,
        text: 'Classic alert not found: alert-1',
      });
      expect(deps.notifications.toasts.addWarning).not.toHaveBeenCalled();
      expect(deps.application.navigateToUrl).not.toHaveBeenCalled();
    });
  });
});
