/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_ALERTING_V2 } from '@kbn/management-settings-ids';
import { loggerMock } from '@kbn/logging-mocks';
import {
  V1_ALERTS_SOURCE,
  V2_ALERTS_SOURCE,
} from '../../lib/sig_events/read_significant_events_from_alerts_indices';
import { resolveAlertsSource } from './resolve_alerts_source';

describe('resolveAlertsSource', () => {
  const logger = loggerMock.create();

  const uiSettings = (value: boolean) =>
    ({
      get: jest.fn((key: string) => {
        if (key === OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_ALERTING_V2) {
          return Promise.resolve(value);
        }
        return Promise.resolve(undefined);
      }),
    } as never);

  const v2Client = {} as never;

  it('returns v1 source when the UI flag is off', async () => {
    const source = await resolveAlertsSource({
      uiSettingsClient: uiSettings(false),
      alertingV2RulesClient: v2Client,
    });
    expect(source).toBe(V1_ALERTS_SOURCE);
  });

  it('returns v2 source when the UI flag is on and the v2 client is available', async () => {
    const source = await resolveAlertsSource({
      uiSettingsClient: uiSettings(true),
      alertingV2RulesClient: v2Client,
    });
    expect(source).toBe(V2_ALERTS_SOURCE);
  });

  it('returns v1 source when the UI flag is on but the v2 client is missing', async () => {
    const source = await resolveAlertsSource({
      uiSettingsClient: uiSettings(true),
      logger,
    });
    expect(source).toBe(V1_ALERTS_SOURCE);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('alerting v2 plugin is not available')
    );
  });
});
