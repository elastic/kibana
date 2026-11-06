/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { S3DestinationViewModel } from './types';

const CONFIGURED_LABEL = i18n.translate('xpack.streams.destinations.s3Details.configuredValue', {
  defaultMessage: 'Configured',
});

interface S3DestinationDetailsProps {
  destination: S3DestinationViewModel;
  /** Flyout chrome: the destination name as title. */
  showHeader?: boolean;
  titleId?: string;
}

export const S3DestinationDetails = ({
  destination,
  showHeader = false,
  titleId,
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
    <EuiDescriptionList
      compressed
      listItems={[
        {
          title: i18n.translate('xpack.streams.destinations.s3Details.bucketLabel', {
            defaultMessage: 'Bucket',
          }),
          description: destination.bucket,
        },
        {
          title: i18n.translate('xpack.streams.destinations.s3Details.regionLabel', {
            defaultMessage: 'Region',
          }),
          description: destination.region,
        },
        ...(destination.prefix
          ? [
              {
                title: i18n.translate('xpack.streams.destinations.s3Details.prefixLabel', {
                  defaultMessage: 'Prefix',
                }),
                description: destination.prefix,
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
      ]}
    />
  </div>
);
