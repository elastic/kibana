/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  buildInboundEventsPath,
  buildInboundEventsUrl,
  INBOUND_EVENTS_TOKEN_MAX_LENGTH,
} from './inbound_events';

describe('INBOUND_EVENTS_TOKEN_MAX_LENGTH', () => {
  it('bounds ingest tokens', () => {
    expect(INBOUND_EVENTS_TOKEN_MAX_LENGTH).toBe(128);
  });
});

describe('buildInboundEventsPath', () => {
  it('builds the hub path with encoded ids', () => {
    expect(
      buildInboundEventsPath({
        connectorTypeId: '.inboundWebhook',
        connectorId: 'sales-ingress',
      })
    ).toBe('/api/actions/events/.inboundWebhook/sales-ingress');
  });
});

describe('buildInboundEventsUrl', () => {
  it('omits the space prefix in the default space', () => {
    expect(
      buildInboundEventsUrl({
        publicBaseUrl: 'https://kibana.example.com',
        spaceId: DEFAULT_SPACE_ID,
        connectorTypeId: '.inboundWebhook',
        connectorId: 'sales-ingress',
      })
    ).toBe('https://kibana.example.com/api/actions/events/.inboundWebhook/sales-ingress');
  });

  it('inserts /s/{spaceId} for a non-default space', () => {
    expect(
      buildInboundEventsUrl({
        publicBaseUrl: 'https://kibana.example.com/kb',
        spaceId: 'marketing',
        connectorTypeId: '.inboundWebhook',
        connectorId: 'sales-ingress',
      })
    ).toBe(
      'https://kibana.example.com/kb/s/marketing/api/actions/events/.inboundWebhook/sales-ingress'
    );
  });

  it('returns a space-aware relative path when publicBaseUrl is omitted', () => {
    expect(
      buildInboundEventsUrl({
        spaceId: 'marketing',
        connectorTypeId: '.inboundWebhook',
        connectorId: 'sales-ingress',
      })
    ).toBe('/s/marketing/api/actions/events/.inboundWebhook/sales-ingress');
  });
});
