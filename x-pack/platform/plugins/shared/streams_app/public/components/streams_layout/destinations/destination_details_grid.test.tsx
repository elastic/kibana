/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DestinationDetailsGrid } from './destination_details_grid';
import { REMOTE_ELASTICSEARCH_TYPE, type RemoteElasticsearchDestinationViewModel } from './types';
import { RemoteElasticsearchDestinationDetails } from './remote_elasticsearch_destination_details';
import { S3DestinationDetails } from './s3_destination_details';
import type { S3DestinationViewModel } from './types';

const s3Destination: S3DestinationViewModel = {
  id: 's3-test',
  name: 'S3 test',
  type: 's3',
  signals: ['logs'],
  bucket: 'streams-s3-test',
  region: 'us-west-2',
};

const remoteDestination: RemoteElasticsearchDestinationViewModel = {
  id: 'backup',
  name: 'Backup',
  type: REMOTE_ELASTICSEARCH_TYPE,
  signals: ['logs', 'metrics'],
  endpoint: 'https://my-cluster.es.example.com',
  mode: 'static',
  indexBySignal: { logs: 'remote-logs', metrics: 'remote-metrics' },
};

describe('DestinationDetailsGrid', () => {
  it('shows each title with its value', () => {
    render(
      <DestinationDetailsGrid
        items={[
          { title: 'Bucket', description: 'streams-s3-test' },
          { title: 'Region', description: 'us-west-2' },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Bucket' })).toBeInTheDocument();
    expect(screen.getByText('streams-s3-test')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Region' })).toBeInTheDocument();
    expect(screen.getByText('us-west-2')).toBeInTheDocument();
  });
});

describe('the layout of the details of a destination', () => {
  it.each([
    ['S3', <S3DestinationDetails destination={s3Destination} />, 'streamsS3DestinationDetails'],
    [
      'remote Elasticsearch',
      <RemoteElasticsearchDestinationDetails destination={remoteDestination} />,
      'streamsRemoteElasticsearchDestinationDetails',
    ],
  ])('is a vertical list by default, as on the cards, for %s', (_name, element, testId) => {
    render(element);

    const details = screen.getByTestId(testId);
    expect(details.querySelector('dl')).not.toBeNull();
    expect(within(details).queryByRole('heading')).not.toBeInTheDocument();
  });

  it('is a grid when asked, with the same items, for S3', () => {
    render(<S3DestinationDetails destination={s3Destination} layout="grid" />);

    const details = within(screen.getByTestId('streamsS3DestinationDetails'));
    expect(screen.getByTestId('streamsS3DestinationDetails').querySelector('dl')).toBeNull();
    ['Bucket', 'Region', 'Access key ID', 'Secret access key'].forEach((title) =>
      expect(details.getByRole('heading', { name: title })).toBeInTheDocument()
    );
    expect(details.getByText('streams-s3-test')).toBeInTheDocument();
    expect(details.getAllByText('Configured')).toHaveLength(2);
  });

  it('is a grid when asked, with the routing of each signal, for remote Elasticsearch', () => {
    render(<RemoteElasticsearchDestinationDetails destination={remoteDestination} layout="grid" />);

    const details = within(screen.getByTestId('streamsRemoteElasticsearchDestinationDetails'));
    expect(details.getByText('https://my-cluster.es.example.com')).toBeInTheDocument();
    expect(details.getByText('remote-logs')).toBeInTheDocument();
    expect(details.getByText('remote-metrics')).toBeInTheDocument();
    expect(details.getByText('Configured')).toBeInTheDocument();
  });
});
