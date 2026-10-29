/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertDetailsUrl } from './alert_details_url';
import { MOCK_KIBANA_BASE_URL } from './fixtures/test_utils';

describe('buildAlertDetailsUrl', () => {
  const build = (spaceId: string, baseUrl: string = MOCK_KIBANA_BASE_URL, alertId = 'ep-1') =>
    buildAlertDetailsUrl({ baseUrl, spaceId, alertId });

  it('builds an absolute direct link to the alert details page', () => {
    expect(build('default')).toBe(
      'https://kibana.example.com/app/observability/alerting/alerts/ep-1'
    );
  });

  it('adds the space prefix for non-default spaces', () => {
    expect(build('team-a')).toBe(
      'https://kibana.example.com/s/team-a/app/observability/alerting/alerts/ep-1'
    );
  });

  it('keeps the server base path of the Kibana base URL', () => {
    expect(build('team-a', 'https://cloud.example.com/kbn')).toBe(
      'https://cloud.example.com/kbn/s/team-a/app/observability/alerting/alerts/ep-1'
    );
  });

  it('encodes the alert id', () => {
    expect(build('default', MOCK_KIBANA_BASE_URL, 'ep/1 a')).toBe(
      'https://kibana.example.com/app/observability/alerting/alerts/ep%2F1%20a'
    );
  });
});
