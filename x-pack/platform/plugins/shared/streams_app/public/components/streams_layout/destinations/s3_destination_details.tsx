/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DestinationDetailsGrid } from './destination_details_grid';
import type { S3DestinationViewModel } from './types';

const CONFIGURED_LABEL = i18n.translate('xpack.streams.destinations.s3Details.configuredValue', {
  defaultMessage: 'Configured',
});

interface S3DestinationDetailsProps {
  destination: S3DestinationViewModel;
  /** Flyout chrome: the destination name as title. */
  showHeader?: boolean;
  titleId?: string;
  /** A vertical `list`, as on the cards, or a two-column `grid`, as in the flyout panel. */
  layout?: 'list' | 'grid';
}

const getItems = ({ bucket, region, prefix }: S3DestinationViewModel) => [
  {
    title: i18n.translate('xpack.streams.destinations.s3Details.bucketLabel', {
      defaultMessage: 'Bucket',
    }),
    description: bucket,
  },
  {
    title: i18n.translate('xpack.streams.destinations.s3Details.regionLabel', {
      defaultMessage: 'Region',
    }),
    description: region,
  },
  ...(prefix
    ? [
        {
          title: i18n.translate('xpack.streams.destinations.s3Details.prefixLabel', {
            defaultMessage: 'Prefix',
          }),
          description: prefix,
        },
      ]
    : []),
  {
    title: i18n.translate('xpack.streams.destinations.s3Details.accessKeyIdLabel', {
      defaultMessage: 'Access key ID',
    }),
    description: CONFIGURED_LABEL,
  },
  {
    title: i18n.translate('xpack.streams.destinations.s3Details.secretAccessKeyLabel', {
      defaultMessage: 'Secret access key',
    }),
    description: CONFIGURED_LABEL,
  },
];

export const S3DestinationDetails = ({
  destination,
  showHeader = false,
  titleId,
  layout = 'list',
}: S3DestinationDetailsProps) => (
  <div data-test-subj="streamsS3DestinationDetails">
    {showHeader && (
      <>
        <EuiTitle size="s">
          <h2 id={titleId}>{destination.name}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </>
    )}
    {layout === 'grid' ? (
      <DestinationDetailsGrid items={getItems(destination)} />
    ) : (
      <EuiDescriptionList compressed listItems={getItems(destination)} />
    )}
  </div>
);
