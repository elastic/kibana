/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { S3DestinationViewModel } from '../../../streams_layout/destinations/types';
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

  it('prefers the description over the destination target as the subtitle', () => {
    const node = buildConfiguredDestinationNode(
      { ...s3Destination, description: 'Long-term log archive' },
      true,
      []
    );

    expect(node.data.subtitle).toBe('Long-term log archive');
    expect(node.data.bucket).toBe('my-archive');
  });

  it('shows the description for a connected Elasticsearch destination', () => {
    const node = buildConfiguredDestinationNode(
      {
        id: 'es-app',
        name: 'App',
        description: 'Application logs',
        type: 'elasticsearch',
        signals: ['logs'],
        mode: 'static',
        indexBySignal: { logs: 'logs-app-default' },
        writePatternsBySignal: {},
      },
      true,
      ['logs-app-default']
    );

    expect(node.data.subtitle).toBe('Application logs');
  });

  it('keeps the no source label ahead of the description', () => {
    const node = buildConfiguredDestinationNode(
      { ...s3Destination, description: 'Long-term log archive' },
      false,
      []
    );

    expect(node.data.subtitle).toBe('No source');
  });
});
