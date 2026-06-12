/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCode, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const aggregationNotSupportedTitle = i18n.translate('xpack.datasetQuality.nonAggregatable.title', {
  defaultMessage: 'Your request may take longer to complete',
});

const aggregationNotSupportedDescription = (dataset: string) => (
  <FormattedMessage
    id="xpack.datasetQuality.flyout.nonAggregatable.description"
    defaultMessage="{description}"
    values={{
      description: (
        <FormattedMessage
          id="xpack.datasetQuality.flyout.nonAggregatable.warning"
          defaultMessage="{dataset}does not support _ignored aggregation and may cause delays when querying data. {howToFixIt}"
          values={{
            dataset: (
              <EuiCode language="json" transparentBackground>
                {dataset}
              </EuiCode>
            ),
            howToFixIt: (
              <FormattedMessage
                id="xpack.datasetQuality.flyout.nonAggregatable.howToFixIt"
                defaultMessage="Manually {rolloverLink} this data set to prevent future delays."
                values={{
                  rolloverLink: (
                    <EuiLink
                      external
                      target="_blank"
                      data-test-subj="datasetQualityFlyoutNonAggregatableHowToFixItLink"
                      href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-rollover-index.html"
                    >
                      {i18n.translate(
                        'xpack.datasetQuality.flyout.nonAggregatableDatasets.link.title',
                        {
                          defaultMessage: 'rollover',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            ),
          }}
        />
      ),
    }}
  />
);

export function AggregationNotSupported({ dataStream }: { dataStream: string }) {
  return (
    <EuiFlexGroup
      data-test-subj="datasetQualityFlyoutNonAggregatableWarning"
      style={{ marginBottom: '24px' }}
    >
      <EuiFlexItem>
        <EuiCallOut title={aggregationNotSupportedTitle} color="warning" iconType="warning">
          <p>{aggregationNotSupportedDescription(dataStream)}</p>
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
