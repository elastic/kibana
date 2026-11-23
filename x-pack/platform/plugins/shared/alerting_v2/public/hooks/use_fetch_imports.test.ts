/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchImports } from './use_fetch_imports';

describe('fetchImports', () => {
  const connector = (
    id: string,
    connectorTypeId: string,
    isInboundEventsEnabled?: boolean
  ): Record<string, unknown> => ({
    id,
    name: `Connector ${id}`,
    connector_type_id: connectorTypeId,
    ...(isInboundEventsEnabled === undefined
      ? {}
      : { is_inbound_events_enabled: isInboundEventsEnabled }),
  });

  const fetchWith = (connectors: Array<Record<string, unknown>>) => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue(connectors);
    return fetchImports(http);
  };

  it('keeps connectors that receive inbound events', async () => {
    await expect(fetchWith([connector('1', '.datadog', true)])).resolves.toEqual([
      { connectorId: '1', name: 'Connector 1', connectorTypeId: '.datadog' },
    ]);
  });

  it('drops connectors with inbound events turned off', async () => {
    await expect(fetchWith([connector('1', '.datadog', false)])).resolves.toEqual([]);
  });

  it('drops connectors without the flag, as when inbound events are disabled in the config', async () => {
    await expect(fetchWith([connector('1', '.datadog')])).resolves.toEqual([]);
  });

  it('excludes custom webhooks', async () => {
    await expect(
      fetchWith([connector('1', '.inboundWebhook', true), connector('2', '.datadog', true)])
    ).resolves.toEqual([{ connectorId: '2', name: 'Connector 2', connectorTypeId: '.datadog' }]);
  });
});
