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
import { timeSerieTickFormatter } from '../../../../utils/formatters';

interface IBucket {
  key: number;
  count: number;
}

// TODO: cleanup duplication of this in distribution/get_distribution.ts (ErrorDistributionAPIResponse) and transactions/distribution/index.ts (TransactionDistributionAPIResponse)
interface IDistribution {
  totalHits: number;
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

export function ErrorDistribution({ distribution, title }: Props) {
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  const isEmpty = distribution.totalHits === 0;

  if (isEmpty) {
    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.errorGroupDetails.noErrorsLabel', {
          defaultMessage: 'No errors were found'
        })}
      />
    );
  }

  const tickValues = buckets
    ? [...buckets.map(d => d.x0), buckets[buckets.length - 1].x]
    : [];
  const formatter = timeSerieTickFormatter(tickValues.map(x => new Date(x)));

  return (
    <div>
      <EuiTitle size="xs">
        <span>{title}</span>
      </EuiTitle>
      <Histogram
        verticalLineHover={(bucket: FormattedBucket) => bucket.x}
        xType="time"
        buckets={buckets}
        bucketSize={distribution.bucketSize}
        tickValues={tickValues}
        formatX={formatter}
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
