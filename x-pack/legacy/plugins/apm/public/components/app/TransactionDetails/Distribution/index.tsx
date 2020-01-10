/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import React, { FunctionComponent, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { TransactionDistributionAPIResponse } from '../../../../../server/lib/transactions/distribution';
import { IBucket } from '../../../../../server/lib/transactions/distribution/get_buckets/transform';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { getDurationFormatter } from '../../../../utils/formatters';
// @ts-ignore
import Histogram from '../../../shared/charts/Histogram';
import { EmptyMessage } from '../../../shared/EmptyMessage';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { history } from '../../../../utils/history';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';

interface IChartPoint {
  samples: IBucket['samples'];
  x0: number;
  x: number;
  y: number;
  style: {
    cursor: string;
  };
}

export function getFormattedBuckets(buckets: IBucket[], bucketSize: number) {
  if (!buckets) {
    return [];
  }

  return buckets.map(
    ({ samples, count, key }): IChartPoint => {
      return {
        samples,
        x0: key,
        x: key + bucketSize,
        y: count,
        style: {
          cursor: isEmpty(samples) ? 'default' : 'pointer'
        }
      };
    }
  );
}

const getFormatYShort = (transactionType: string | undefined) => (
  t: number
) => {
  return i18n.translate(
    'xpack.apm.transactionDetails.transactionsDurationDistributionChart.unitShortLabel',
    {
      defaultMessage:
        '{transCount} {transType, select, request {req.} other {trans.}}',
      values: {
        transCount: t,
        transType: transactionType
      }
    }
  );
};

const getFormatYLong = (transactionType: string | undefined) => (t: number) => {
  return transactionType === 'request'
    ? i18n.translate(
        'xpack.apm.transactionDetails.transactionsDurationDistributionChart.requestTypeUnitLongLabel',
        {
          defaultMessage:
            '{transCount, plural, =0 {# request} one {# request} other {# requests}}',
          values: {
            transCount: t
          }
        }
      )
    : i18n.translate(
        'xpack.apm.transactionDetails.transactionsDurationDistributionChart.transactionTypeUnitLongLabel',
        {
          defaultMessage:
            '{transCount, plural, =0 {# transaction} one {# transaction} other {# transactions}}',
          values: {
            transCount: t
          }
        }
      );
};

interface Props {
  distribution?: TransactionDistributionAPIResponse;
  urlParams: IUrlParams;
  isLoading: boolean;
  bucketIndex: number;
}

export const TransactionDistribution: FunctionComponent<Props> = (
  props: Props
) => {
  const {
    distribution,
    urlParams: { transactionType },
    isLoading,
    bucketIndex
  } = props;

  const formatYShort = useCallback(getFormatYShort(transactionType), [
    transactionType
  ]);

  const formatYLong = useCallback(getFormatYLong(transactionType), [
    transactionType
  ]);

  // no data in response
  if (!distribution || distribution.noHits) {
    // only show loading state if there is no data - else show stale data until new data has loaded
    if (isLoading) {
      return <LoadingStatePrompt />;
    }

    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.transactionDetails.notFoundLabel', {
          defaultMessage: 'No transactions were found.'
        })}
      />
    );
  }

  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  const xMax = d3.max(buckets, d => d.x) || 0;
  const timeFormatter = getDurationFormatter(xMax);

  return (
    <div>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate(
            'xpack.apm.transactionDetails.transactionsDurationDistributionChartTitle',
            {
              defaultMessage: 'Transactions duration distribution'
            }
          )}{' '}
          <EuiIconTip
            title={i18n.translate(
              'xpack.apm.transactionDetails.transactionsDurationDistributionChartTooltip.samplingLabel',
              {
                defaultMessage: 'Sampling'
              }
            )}
            content={i18n.translate(
              'xpack.apm.transactionDetails.transactionsDurationDistributionChartTooltip.samplingDescription',
              {
                defaultMessage:
                  "Each bucket will show a sample transaction. If there's no sample available, it's most likely because of the sampling limit set in the agent configuration."
              }
            )}
            position="top"
          />
        </h5>
      </EuiTitle>

      <Histogram
        buckets={buckets}
        bucketSize={distribution.bucketSize}
        bucketIndex={bucketIndex}
        onClick={(bucket: IChartPoint) => {
          if (!isEmpty(bucket.samples)) {
            const sample = bucket.samples[0];
            history.push({
              ...history.location,
              search: fromQuery({
                ...toQuery(history.location.search),
                transactionId: sample.transactionId,
                traceId: sample.traceId
              })
            });
          }
        }}
        formatX={(time: number) => timeFormatter(time).formatted}
        formatYShort={formatYShort}
        formatYLong={formatYLong}
        verticalLineHover={(bucket: IChartPoint) => isEmpty(bucket.samples)}
        backgroundHover={(bucket: IChartPoint) => !isEmpty(bucket.samples)}
        tooltipHeader={(bucket: IChartPoint) => {
          const xFormatted = timeFormatter(bucket.x);
          const x0Formatted = timeFormatter(bucket.x0);
          return `${x0Formatted.value} - ${xFormatted.value} ${xFormatted.unit}`;
        }}
        tooltipFooter={(bucket: IChartPoint) =>
          isEmpty(bucket.samples) &&
          i18n.translate(
            'xpack.apm.transactionDetails.transactionsDurationDistributionChart.noSampleTooltip',
            {
              defaultMessage: 'No sample available for this bucket'
            }
          )
        }
      />
    </div>
  );
};
