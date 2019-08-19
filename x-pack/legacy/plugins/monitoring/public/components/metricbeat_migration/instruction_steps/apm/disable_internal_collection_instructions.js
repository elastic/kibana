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
import { statusTitle } from './common_apm_instructions';

export function getApmInstructionsForDisablingInternalCollection(product, meta) {
  const disableInternalCollectionStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.apmInstructions.disableInternalCollection.title', {
      defaultMessage: 'Disable internal collection of the APM server\'s monitoring metrics'
    }),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.disableInternalCollection.description"
              defaultMessage="Add the following setting in the APM server's configuration file ({file}):"
              values={{
                file: (
                  <Monospace>apm-server.yml</Monospace>
                )
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s"/>
        <EuiCodeBlock
          isCopyable
          language="bash"
        >
          monitoring.enabled: false
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.disableInternalCollection.note"
              defaultMessage="You'll need to restart the APM server after making this change."
            />
          </p>
        </EuiText>
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
        id="xpack.monitoring.metricbeatMigration.apmInstructions.disableInternalCollection.partiallyMigratedStatusDescription"
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
          title={i18n.translate('xpack.monitoring.metricbeatMigration.apmInstructions.partiallyMigratedStatusTitle',
            {
              defaultMessage: `We still see data coming from internal collection of this APM server.`
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.partiallyMigratedStatusDescription"
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
            'xpack.monitoring.metricbeatMigration.apmInstructions.disableInternalCollection.fullyMigratedStatusTitle',
            {
              defaultMessage: 'Congratulations!'
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.disableInternalCollection.fullyMigratedStatusDescription"
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
