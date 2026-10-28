/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REMOTE_ELASTICSEARCH_TYPE } from '../../../streams_layout/destinations/remote_elasticsearch_constants';
import type {
  RemoteElasticsearchDestinationViewModel,
  S3DestinationViewModel,
} from '../../../streams_layout/destinations/types';
import { buildConfiguredDestinationNode } from '.';

const s3Destination: S3DestinationViewModel = {
  id: 'archive',
  name: 'Archive',
  type: 's3',
  signals: ['logs'],
  bucket: 'my-archive',
  region: 'eu-west-1',
};

describe('buildConfiguredDestinationNode', () => {
  it('announces a disconnected S3 destination as having no source', () => {
    const node = buildConfiguredDestinationNode(s3Destination, false, []);

    expect(node.ariaLabel).toBe('Destination: Archive, Logs, no source');
    expect(node.data.subtitle).toBe('No source');
  });

  it('announces a connected S3 destination without the no source suffix', () => {
    const node = buildConfiguredDestinationNode(s3Destination, true, []);

    expect(node.ariaLabel).toBe('Destination: Archive, Logs');
    expect(node.data.subtitle).toBe('my-archive');
  });

  describe('remote Elasticsearch', () => {
    const remoteDestination = (
      partial: Partial<RemoteElasticsearchDestinationViewModel> = {}
    ): RemoteElasticsearchDestinationViewModel => ({
      id: 'backup',
      name: 'Backup',
      type: REMOTE_ELASTICSEARCH_TYPE,
      signals: ['logs', 'traces'],
      endpoint: 'https://my-cluster.es.example.com:9243/proxy/',
      mode: 'static',
      indexBySignal: { logs: 'remote-logs', traces: 'remote-traces' },
      ...partial,
    });

    it('announces a disconnected remote destination as having no source', () => {
      const node = buildConfiguredDestinationNode(remoteDestination(), false, []);

      expect(node.ariaLabel).toBe('Destination: Backup, Logs, Traces, no source');
      expect(node.data.subtitle).toBe('No source');
    });

    it('shows the endpoint host for a connected remote destination', () => {
      const node = buildConfiguredDestinationNode(remoteDestination(), true, []);

      expect(node.ariaLabel).toBe('Destination: Backup, Logs, Traces');
      expect(node.data.subtitle).toBe('my-cluster.es.example.com:9243');
    });

    it.each(['not a url', 'my-cluster:9200'])(
      'falls back to the full endpoint for %s',
      (endpoint) => {
        const node = buildConfiguredDestinationNode(remoteDestination({ endpoint }), true, []);

        expect(node.data.subtitle).toBe(endpoint);
      }
    );

    it('carries no index count, stream name or targeted indices', () => {
      const node = buildConfiguredDestinationNode(remoteDestination(), true, ['remote-logs']);

      expect(node.ariaLabel).not.toMatch(/ind(ex|ices)/);
      expect(node.data.indexCount).toBeUndefined();
      expect(node.data.streamName).toBeUndefined();
      expect(node.data.targetedIndexNames).toBeUndefined();
    });
  });
});
