/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchDestinationViewModel,
  S3DestinationViewModel,
} from '../../../streams_layout/destinations/types';
import { buildConfiguredDestinationNode } from '.';

const elasticsearchDestination: ElasticsearchDestinationViewModel = {
  id: 'es-prod',
  name: 'Production',
  type: 'elasticsearch',
  signals: ['logs'],
  mode: 'static',
  index: 'logs-prod',
};

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

  describe('destinationType', () => {
    it('is set to elasticsearch for an Elasticsearch destination', () => {
      const node = buildConfiguredDestinationNode(elasticsearchDestination, true, ['logs-prod']);

      expect(node.data.destinationType).toBe('elasticsearch');
    });

    it('is set to s3 for an S3 destination', () => {
      const node = buildConfiguredDestinationNode(s3Destination, true, []);

      expect(node.data.destinationType).toBe('s3');
    });
  });

  // Stats come from the stats manager. They never enter the node data, because a change to the
  // data rebuilds the graph and runs the layout again.
  describe('node data', () => {
    it('holds configuration only, for an Elasticsearch destination', () => {
      const node = buildConfiguredDestinationNode(elasticsearchDestination, true, ['logs-prod']);

      expect(Object.keys(node.data).sort()).toEqual([
        'destinationId',
        'destinationType',
        'indexCount',
        'signals',
        'streamName',
        'subtitle',
        'targetedIndexNames',
        'title',
      ]);
    });

    it('holds configuration only, for an S3 destination', () => {
      const node = buildConfiguredDestinationNode(s3Destination, true, []);

      expect(Object.keys(node.data).sort()).toEqual([
        'destinationId',
        'destinationType',
        'signals',
        'subtitle',
        'title',
      ]);
    });
  });
});
