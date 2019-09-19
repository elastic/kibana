/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiCodeBlock,
  EuiCallOut,
  EuiText
} from '@elastic/eui';
import { formatTimestampToDuration } from '../../../../../common';
import { CALCULATE_DURATION_SINCE } from '../../../../../common/constants';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { statusTitle } from './common_elasticsearch_instructions';

export function getElasticsearchInstructionsForDisablingInternalCollection(product, meta) {
  const disableInternalCollectionStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.disableInternalCollectionTitle', {
      defaultMessage: 'Disable internal collection of Elasticsearch monitoring metrics'
    }),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.disableInternalCollectionDescription"
              defaultMessage="Disable internal collection of Elasticsearch monitoring metrics.
            Set {monospace} to false on each server in the production cluster."
              values={{
                monospace: (
                  <Monospace>xpack.monitoring.elasticsearch.collection.enabled</Monospace>
                )
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s"/>
        <EuiCodeBlock
          isCopyable
          language="curl"
        >
          {`PUT _cluster/settings
{
  "persistent": {
    "xpack.monitoring.elasticsearch.collection.enabled": false
  }
}
          `}
        </EuiCodeBlock>
      </Fragment>
    )
  };

  let migrationStatusStep = null;
  if (!product || !product.isFullyMigrated) {
    let lastInternallyCollectedMessage = '';
    // It is possible that, during the migration steps, products are not reporting
    // monitoring data for a period of time outside the window of our server-side check
    // and this is most likely temporary so we want to be defensive and not error out
    // and hopefully wait for the next check and this state will be self-corrected.
    if (product) {
      const lastInternallyCollectedTimestamp = product.lastInternallyCollectedTimestamp || product.lastTimestamp;
      const secondsSinceLastInternalCollectionLabel =
        formatTimestampToDuration(lastInternallyCollectedTimestamp, CALCULATE_DURATION_SINCE);
      lastInternallyCollectedMessage = (<FormattedMessage
        id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.disableInternalCollection.partiallyMigratedStatusDescription"
        defaultMessage="Last internal collection occurred {secondsSinceLastInternalCollectionLabel} ago."
        values={{
          secondsSinceLastInternalCollectionLabel,
        }}
      />);
    }

    migrationStatusStep = {
      title: statusTitle,
      status: 'incomplete',
      children: (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.partiallyMigratedStatusTitle',
            {
              defaultMessage: `We still see data coming from internal collection of Elasticsearch.`
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.partiallyMigratedStatusDescription"
              defaultMessage="Note that it can take up to {secondsAgo} seconds to detect, but
              we will continuously check in the background."
              values={{
                secondsAgo: meta.secondsAgo,
              }}
            />
          </p>
          <p>
            {lastInternallyCollectedMessage}
          </p>
        </EuiCallOut>
      )
    };
  }
  else {
    migrationStatusStep = {
      title: statusTitle,
      status: 'complete',
      children: (
        <EuiCallOut
          size="s"
          color="success"
          title={i18n.translate(
            'xpack.monitoring.metricbeatMigration.elasticsearchInstructions.disableInternalCollection.fullyMigratedStatusTitle',
            {
              defaultMessage: 'Congratulations!'
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.disableInternalCollection.fullyMigratedStatusDescription"
              defaultMessage="We are not seeing any documents from internal collection. Migration complete!"
            />
          </p>
        </EuiCallOut>
      )
    };
  }

  return [
    disableInternalCollectionStep,
    migrationStatusStep
  ];
}
