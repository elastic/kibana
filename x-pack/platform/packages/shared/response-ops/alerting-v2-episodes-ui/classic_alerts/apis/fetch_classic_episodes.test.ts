/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { fetchClassicAlertsAsEpisodes } from './fetch_classic_episodes';
import { CLASSIC_ALERT_EPISODE_SOURCE_FIELDS } from '../utils/map_alert';

const mockHttp = httpServiceMock.createStartContract();

const TEST_RULE_TYPE_IDS = ['observability.rules.custom_threshold', '.es-query'];

const FIND_MUTED_ALERTS_PATH = '/internal/alerting/rules/_find_muted_alerts';
const RAC_FIND_PATH = '/internal/rac/alerts/find';

const makeHit = (source: Record<string, unknown>, index = '.alerts-observability.test') => ({
  _id: `hit-${source['kibana.alert.uuid'] ?? '1'}`,
  _index: index,
  _source: source,
});

const makeAlertSource = (overrides: Record<string, unknown> = {}) => ({
  'kibana.alert.uuid': 'uuid-1',
  'kibana.alert.status': 'active',
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Test Rule',
  'kibana.alert.instance.id': 'instance-1',
  '@timestamp': '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const emptySnoozeResponse = { data: [] };

const mockPost = (handler: (url: string) => Promise<unknown>) => {
  mockHttp.post.mockImplementation(handler as unknown as typeof mockHttp.post);
};

describe('fetchClassicAlertsAsEpisodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const callFetch = (overrides?: Partial<Parameters<typeof fetchClassicAlertsAsEpisodes>[0]>) =>
    fetchClassicAlertsAsEpisodes({
      pageSize: 100,
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
      ...overrides,
    });

  it('calls the RAC find endpoint and maps hits to episodes', async () => {
    mockPost((url: string) => {
      if (url === RAC_FIND_PATH) {
        return Promise.resolve({ hits: { hits: [makeHit(makeAlertSource())] } });
      }
      return Promise.resolve(emptySnoozeResponse);
    });

    const episodes = await callFetch();

    const racCall = mockHttp.post.mock.calls.find(
      ([url]) => (url as unknown as string) === RAC_FIND_PATH
    )! as unknown as [string, { body: string }];
    const body = JSON.parse(racCall[1].body);
    expect(body.rule_type_ids).toEqual(TEST_RULE_TYPE_IDS);
    expect(body._source).toEqual([...CLASSIC_ALERT_EPISODE_SOURCE_FIELDS]);
    expect(episodes).toHaveLength(1);
    expect(episodes[0].supports_actions).toBe(false);
    expect(episodes[0].supports_timeline).toBe(false);
  });

  it('skips hits without _source', async () => {
    mockPost((url: string) => {
      if (url === RAC_FIND_PATH) {
        return Promise.resolve({ hits: { hits: [{ _id: 'no-source' }] } });
      }
      return Promise.resolve(emptySnoozeResponse);
    });

    const episodes = await callFetch();
    expect(episodes).toHaveLength(0);
  });

  it('stamps last_snooze_action for indefinitely muted alerts', async () => {
    mockPost((url: string) => {
      if (url === RAC_FIND_PATH) {
        return Promise.resolve({ hits: { hits: [makeHit(makeAlertSource())] } });
      }
      if (url === FIND_MUTED_ALERTS_PATH) {
        return Promise.resolve({
          data: [
            {
              id: 'rule-1',
              muted_alert_instance_ids: ['instance-1'],
              snoozed_alert_instances: [],
            },
          ],
        });
      }
      return Promise.resolve(emptySnoozeResponse);
    });

    const episodes = await callFetch();
    expect(episodes[0].last_snooze_action).toBe(ALERT_EPISODE_ACTION_TYPE.SNOOZE);
    expect(episodes[0].snooze_expiry).toBeNull();
  });

  it('stamps last_snooze_action and snooze_expiry for time-snoozed alerts', async () => {
    const expiresAt = '2099-01-01T00:00:00.000Z';
    mockPost((url: string) => {
      if (url === RAC_FIND_PATH) {
        return Promise.resolve({ hits: { hits: [makeHit(makeAlertSource())] } });
      }
      if (url === FIND_MUTED_ALERTS_PATH) {
        return Promise.resolve({
          data: [
            {
              id: 'rule-1',
              muted_alert_instance_ids: [],
              snoozed_alert_instances: [
                {
                  instance_id: 'instance-1',
                  expires_at: expiresAt,
                  snoozed_at: '2024-01-01T00:00:00.000Z',
                  snoozed_by: 'user-1',
                },
              ],
            },
          ],
        });
      }
      return Promise.resolve(emptySnoozeResponse);
    });

    const episodes = await callFetch();
    expect(episodes[0].last_snooze_action).toBe(ALERT_EPISODE_ACTION_TYPE.SNOOZE);
    expect(episodes[0].snooze_expiry).toBe(expiresAt);
  });

  it('leaves snooze fields unset when alert is not muted or snoozed', async () => {
    mockPost((url: string) => {
      if (url === RAC_FIND_PATH) {
        return Promise.resolve({ hits: { hits: [makeHit(makeAlertSource())] } });
      }
      if (url === FIND_MUTED_ALERTS_PATH) {
        return Promise.resolve({
          data: [{ id: 'rule-1', muted_alert_instance_ids: [], snoozed_alert_instances: [] }],
        });
      }
      return Promise.resolve(emptySnoozeResponse);
    });

    const episodes = await callFetch();
    expect(episodes[0]).not.toHaveProperty('last_snooze_action');
    expect(episodes[0]).not.toHaveProperty('snooze_expiry');
  });

  it('gracefully falls back when snooze state fetch fails', async () => {
    mockPost((url: string) => {
      if (url === RAC_FIND_PATH) {
        return Promise.resolve({ hits: { hits: [makeHit(makeAlertSource())] } });
      }
      return Promise.reject(new Error('Network error'));
    });

    const episodes = await callFetch();
    expect(episodes).toHaveLength(1);
    expect(episodes[0]).not.toHaveProperty('last_snooze_action');
  });

  it('prefers snoozed instance over muted when both are present', async () => {
    const expiresAt = '2099-06-01T00:00:00.000Z';
    mockPost((url: string) => {
      if (url === RAC_FIND_PATH) {
        return Promise.resolve({ hits: { hits: [makeHit(makeAlertSource())] } });
      }
      if (url === FIND_MUTED_ALERTS_PATH) {
        return Promise.resolve({
          data: [
            {
              id: 'rule-1',
              muted_alert_instance_ids: ['instance-1'],
              snoozed_alert_instances: [
                {
                  instance_id: 'instance-1',
                  expires_at: expiresAt,
                  snoozed_at: '2024-01-01T00:00:00.000Z',
                  snoozed_by: 'user-1',
                },
              ],
            },
          ],
        });
      }
      return Promise.resolve(emptySnoozeResponse);
    });

    const episodes = await callFetch();
    expect(episodes[0].snooze_expiry).toBe(expiresAt);
  });
});
