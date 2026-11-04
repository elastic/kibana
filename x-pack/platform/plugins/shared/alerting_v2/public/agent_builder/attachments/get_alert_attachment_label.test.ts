/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertAttachmentData } from '@kbn/alerting-v2-schemas';
import { getAlertAttachmentLabel } from './get_alert_attachment_label';

const baseData: AlertAttachmentData = {
  '@timestamp': '2026-04-10T12:00:00.000Z',
  'alert.id': '65206401-eb66-43fe-89e9-c712c2f1c0a6',
  'alert.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-04-10T11:00:00.000Z',
  last_timestamp: '2026-04-10T12:00:00.000Z',
  duration: 3600000,
};

describe('getAlertAttachmentLabel', () => {
  it('uses the alert label', () => {
    expect(
      getAlertAttachmentLabel({
        data: { ...baseData, 'alert.label': 'Host CPU high alert' },
      })
    ).toBe('Host CPU high alert');
  });

  it('does not use the alert UUID when no label is available', () => {
    expect(getAlertAttachmentLabel({ data: baseData })).toBe('Alert');
  });
});
