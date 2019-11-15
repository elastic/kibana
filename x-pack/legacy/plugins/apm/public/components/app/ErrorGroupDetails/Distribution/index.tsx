/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
// @ts-ignore
import Histogram from '../../../shared/charts/Histogram';
import { EmptyMessage } from '../../../shared/EmptyMessage';
import { asRelativeDateTimeRange } from '../../../../utils/formatters';

interface IBucket {
  key: number;
  count: number;
}

// TODO: cleanup duplication of this in distribution/get_distribution.ts (ErrorDistributionAPIResponse) and transactions/distribution/index.ts (TransactionDistributionAPIResponse)
interface IDistribution {
  noHits: boolean;
  buckets: IBucket[];
  bucketSize: number;
}

interface FormattedBucket {
  x0: number;
  x: number;
  y: number;
}

export function getFormattedBuckets(
  buckets: IBucket[],
  bucketSize: number
): FormattedBucket[] | null {
  if (!buckets) {
    return null;
  }

  return buckets.map(({ count, key }) => {
    return {
      x0: key,
      x: key + bucketSize,
      y: count
    };
  });
}

interface Props {
  distribution: IDistribution;
  title: React.ReactNode;
}

const tooltipHeader = (bucket: FormattedBucket) =>
  asRelativeDateTimeRange(bucket.x0, bucket.x);

export function ErrorDistribution({ distribution, title }: Props) {
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  if (distribution.noHits) {
    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.errorGroupDetails.noErrorsLabel', {
          defaultMessage: 'No errors were found'
        })}
      />
    );
  }

  return (
    <div>
      <EuiTitle size="xs">
        <span>{title}</span>
      </EuiTitle>
      <Histogram
        tooltipHeader={tooltipHeader}
        verticalLineHover={(bucket: FormattedBucket) => bucket.x}
        xType="time"
        buckets={buckets}
        bucketSize={distribution.bucketSize}
        formatYShort={(value: number) =>
          i18n.translate('xpack.apm.errorGroupDetails.occurrencesShortLabel', {
            defaultMessage: '{occCount} occ.',
            values: { occCount: value }
          })
        }
        formatYLong={(value: number) =>
          i18n.translate('xpack.apm.errorGroupDetails.occurrencesLongLabel', {
            defaultMessage: '{occCount} occurrences',
            values: { occCount: value }
          })
        }
      />
    </div>
  );
}
