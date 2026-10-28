/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import type { AlertFormatter } from '@kbn/alerts-ui-shared';
import type { AlertEpisode } from '../queries/episodes_query';
import type { ClassicAlertActionContext } from '../classic_alerts/utils/map_alert';
import { fetchClassicAlertById } from '../classic_alerts/apis/fetch_classic_alert_by_id';
import { createViewInAppAction } from './view_in_app';
import * as i18n from './translations';

jest.mock('../classic_alerts/apis/fetch_classic_alert_by_id');

const mockFetchClassicAlertById = fetchClassicAlertById as jest.MockedFunction<
  typeof fetchClassicAlertById
>;

const RULE_TYPE_ID = 'apm.error_rate';

const makeClassicEpisode = (
  alertUuid: string,
  { ruleTypeId = RULE_TYPE_ID }: { ruleTypeId?: string } = {}
): AlertEpisode =>
  ({
    'episode.id': alertUuid,
    'rule.id': 'rule-1',
    source_id: 'v1',
    source_action_context: {
      index: '.alerts-test',
      alertUuid,
      instanceId: 'instance-1',
      ruleId: 'rule-1',
      ruleTypeId,
      workflowStatus: 'open',
      workflowTags: [],
      caseIds: [],
    } as ClassicAlertActionContext,
  } as unknown as AlertEpisode);

const makeNativeEpisode = (id: string): AlertEpisode =>
  ({ 'episode.id': id, 'rule.id': 'rule-v2' } as unknown as AlertEpisode);

const defaultFormatter: AlertFormatter = () => ({ reason: '', link: '/app/apm' });

const setup = (formatter: AlertFormatter | null = defaultFormatter) => {
  const http = httpServiceMock.createStartContract({ basePath: '/s/space' });
  const notifications = notificationServiceMock.createStartContract();
  const getAlertFormatter = jest.fn(() => formatter ?? undefined);
  const action = createViewInAppAction({ http, notifications, getAlertFormatter });
  return { http, notifications, getAlertFormatter, action };
};

describe('createViewInAppAction', () => {
  let newTab: {
    opener: unknown;
    closed: boolean;
    location: { href: string };
    close: jest.Mock;
  };
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    newTab = { opener: {}, closed: false, location: { href: '' }, close: jest.fn() };
    openSpy = jest
      .spyOn(window, 'open')
      .mockImplementation(() => newTab as unknown as Window | null);
    mockFetchClassicAlertById.mockResolvedValue({
      'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
      _index: '.alerts-test',
      _id: 'a1',
    });
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  describe('isCompatible', () => {
    it('is compatible with a single classic alert whose rule type has a formatter', () => {
      const { action, getAlertFormatter } = setup();

      expect(action.isCompatible({ episodes: [makeClassicEpisode('a1')] })).toBe(true);
      expect(getAlertFormatter).toHaveBeenCalledWith(RULE_TYPE_ID);
    });

    it('is not compatible when the rule type has no formatter', () => {
      const { action } = setup(null);

      expect(action.isCompatible({ episodes: [makeClassicEpisode('a1')] })).toBe(false);
    });

    it('is not compatible when the classic alert has no rule type id', () => {
      const { action } = setup();
      const episode = makeClassicEpisode('a1', { ruleTypeId: '' });

      expect(action.isCompatible({ episodes: [episode] })).toBe(false);
    });

    it('is not compatible with v2 episodes', () => {
      const { action } = setup();

      expect(action.isCompatible({ episodes: [makeNativeEpisode('e1')] })).toBe(false);
    });

    it('is not compatible with multiple episodes', () => {
      const { action } = setup();

      expect(
        action.isCompatible({ episodes: [makeClassicEpisode('a1'), makeClassicEpisode('a2')] })
      ).toBe(false);
    });

    it('is excluded from bulk actions and kept for read-only users', () => {
      const { action } = setup();

      expect(action.supportsBulk).toBe(false);
      expect(action.enforcesOwnPrivileges).toBe(true);
    });
  });

  describe('execute', () => {
    it('fetches the alert scoped to its rule type and opens the prepended link in a new tab', async () => {
      const formatter = jest.fn<ReturnType<AlertFormatter>, Parameters<AlertFormatter>>(() => ({
        reason: '',
        link: '/app/apm/services/opbeans',
      }));
      const { action, http } = setup(formatter);

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(mockFetchClassicAlertById).toHaveBeenCalledWith({
        ruleTypeIds: [RULE_TYPE_ID],
        id: 'a1',
        services: { http },
      });
      expect(formatter).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.objectContaining({ 'kibana.alert.rule.rule_type_id': RULE_TYPE_ID }),
        })
      );
      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(newTab.opener).toBeNull();
      expect(newTab.location.href).toBe('/s/space/app/apm/services/opbeans');
    });

    it('passes array values from the alert document unchanged', async () => {
      mockFetchClassicAlertById.mockResolvedValue({
        'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
        'observer.geo.name': ['us-east', 'eu-west'],
      });
      const formatter = jest.fn<ReturnType<AlertFormatter>, Parameters<AlertFormatter>>(() => ({
        reason: '',
        link: '/app/uptime',
      }));
      const { action } = setup(formatter);

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(formatter).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.objectContaining({ 'observer.geo.name': ['us-east', 'eu-west'] }),
        })
      );
    });

    it('derives group field and value arrays from the stored group objects', async () => {
      mockFetchClassicAlertById.mockResolvedValue({
        'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
        'kibana.alert.group': [
          { field: 'Carrier', value: 'ES-Air' },
          { field: 'DestCountry', value: 'IT' },
        ],
      });
      const formatter = jest.fn<ReturnType<AlertFormatter>, Parameters<AlertFormatter>>(() => ({
        reason: '',
        link: '/app/discover',
      }));
      const { action } = setup(formatter);

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(formatter).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.objectContaining({
            'kibana.alert.group.field': ['Carrier', 'DestCountry'],
            'kibana.alert.group.value': ['ES-Air', 'IT'],
          }),
        })
      );
    });

    it('keeps group field and value arrays already present on the alert document', async () => {
      mockFetchClassicAlertById.mockResolvedValue({
        'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
        'kibana.alert.group': [{ field: 'Carrier', value: 'ES-Air' }],
        'kibana.alert.group.field': ['host.name'],
        'kibana.alert.group.value': ['web-01'],
      });
      const formatter = jest.fn<ReturnType<AlertFormatter>, Parameters<AlertFormatter>>(() => ({
        reason: '',
        link: '/app/discover',
      }));
      const { action } = setup(formatter);

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(formatter).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.objectContaining({
            'kibana.alert.group.field': ['host.name'],
            'kibana.alert.group.value': ['web-01'],
          }),
        })
      );
    });

    it('detaches the new tab from Kibana before the alert is fetched', async () => {
      let openerDuringFetch: unknown = 'not fetched';
      mockFetchClassicAlertById.mockImplementation(async () => {
        openerDuringFetch = newTab.opener;
        return { 'kibana.alert.rule.rule_type_id': RULE_TYPE_ID };
      });
      const { action } = setup();

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(openerDuringFetch).toBeNull();
    });

    it('does not navigate when the user closed the new tab before the link resolved', async () => {
      mockFetchClassicAlertById.mockImplementation(async () => {
        newTab.closed = true;
        return { 'kibana.alert.rule.rule_type_id': RULE_TYPE_ID };
      });
      const { action } = setup();

      await expect(
        action.execute({ episodes: [makeClassicEpisode('a1')] })
      ).resolves.toBeUndefined();

      expect(newTab.location.href).toBe('');
      expect(openSpy).toHaveBeenCalledTimes(1);
    });

    it('keeps a link that already includes the base path', async () => {
      const { action } = setup(() => ({
        reason: '',
        link: '/s/space/app/apm',
        hasBasePath: true,
      }));

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(newTab.location.href).toBe('/s/space/app/apm');
    });

    it('opens the link directly when the browser does not return the new tab', async () => {
      openSpy.mockImplementation(() => null);
      const { action } = setup();

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(openSpy).toHaveBeenLastCalledWith('/s/space/app/apm', '_blank', 'noopener,noreferrer');
    });

    it('closes the new tab and warns when the formatter returns no link', async () => {
      const { action, notifications } = setup(() => ({ reason: '' }));

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(newTab.close).toHaveBeenCalled();
      expect(notifications.toasts.addWarning).toHaveBeenCalledWith({
        title: i18n.VIEW_IN_APP_NO_LINK,
      });
    });

    it('closes the new tab and reports an error when the alert cannot be fetched', async () => {
      mockFetchClassicAlertById.mockRejectedValue(new Error('not found'));
      const { action, notifications } = setup();

      await action.execute({ episodes: [makeClassicEpisode('a1')] });

      expect(newTab.close).toHaveBeenCalled();
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: i18n.VIEW_IN_APP_ERROR,
        text: 'not found',
      });
    });

    it('does nothing for an incompatible selection', async () => {
      const { action } = setup();

      await action.execute({ episodes: [makeNativeEpisode('e1')] });

      expect(openSpy).not.toHaveBeenCalled();
      expect(mockFetchClassicAlertById).not.toHaveBeenCalled();
    });
  });
});
