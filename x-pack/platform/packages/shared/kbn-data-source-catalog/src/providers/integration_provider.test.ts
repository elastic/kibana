/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchIntegrationMetadata } from './integration_provider';
import type { PackageClientLike } from './integration_provider';

describe('fetchIntegrationMetadata', () => {
  let packageClient: jest.Mocked<PackageClientLike>;

  beforeEach(() => {
    packageClient = {
      getInstalledPackages: jest.fn(),
    };
  });

  it('returns a map of data stream name to integration metadata', async () => {
    packageClient.getInstalledPackages.mockResolvedValue({
      items: [
        {
          name: 'endpoint',
          version: '8.14.0',
          title: 'Elastic Endpoint',
          description: 'Endpoint security integration',
          status: 'installed',
          dataStreams: [
            { name: 'logs-endpoint.events.process-*', title: 'Endpoint Process Events' },
            { name: 'logs-endpoint.events.network-*', title: 'Endpoint Network Events' },
          ],
          icons: [{ src: '/img/endpoint.svg', type: 'image/svg+xml' }],
        },
      ],
      total: 1,
    });

    const result = await fetchIntegrationMetadata(packageClient);

    expect(result.size).toBe(2);

    const processEntry = result.get('logs-endpoint.events.process-*');
    expect(processEntry).toBeDefined();
    expect(processEntry?.package_name).toBe('endpoint');
    expect(processEntry?.package_title).toBe('Elastic Endpoint');
    expect(processEntry?.package_version).toBe('8.14.0');
    expect(processEntry?.dataset).toBe('endpoint.events.process');
    expect(processEntry?.description).toBe('Endpoint security integration');
    expect(processEntry?.data_stream_title).toBe('Endpoint Process Events');
    expect(processEntry?.icons).toEqual([{ src: '/img/endpoint.svg', type: 'image/svg+xml' }]);

    const networkEntry = result.get('logs-endpoint.events.network-*');
    expect(networkEntry).toBeDefined();
    expect(networkEntry?.package_name).toBe('endpoint');
    expect(networkEntry?.dataset).toBe('endpoint.events.network');
    expect(networkEntry?.data_stream_title).toBe('Endpoint Network Events');
  });

  it('handles packages with no data streams', async () => {
    packageClient.getInstalledPackages.mockResolvedValue({
      items: [
        {
          name: 'empty-package',
          version: '1.0.0',
          status: 'installed',
          dataStreams: [],
        },
      ],
      total: 1,
    });

    const result = await fetchIntegrationMetadata(packageClient);

    expect(result.size).toBe(0);
  });

  it('returns empty map when no packages installed', async () => {
    packageClient.getInstalledPackages.mockResolvedValue({ items: [], total: 0 });

    const result = await fetchIntegrationMetadata(packageClient);

    expect(result.size).toBe(0);
  });
});
