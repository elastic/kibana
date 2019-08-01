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
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiText
} from '@elastic/eui';
import { formatTimestampToDuration } from '../../../../../common';
import { CALCULATE_DURATION_SINCE } from '../../../../../common/constants';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { statusTitle, UNDETECTED_BEAT_TYPE } from './common_beats_instructions';

export function getBeatsInstructionsForDisablingInternalCollection(product, meta, {
  checkForMigrationStatus,
  checkingMigrationStatus,
  hasCheckedStatus,
  autoCheckIntervalInMs,
}) {
  const beatType = product.beatType;
  const disableInternalCollectionStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.title', {
      defaultMessage: 'Disable internal collection of {beatType}\'s monitoring metrics',
      values: {
        beatType: beatType || UNDETECTED_BEAT_TYPE
      }
    }),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.description"
              defaultMessage="Add the following setting in {beatType}'s configuration file ({file}):"
              values={{
                beatType: beatType || UNDETECTED_BEAT_TYPE,
                file: (
                  <Monospace>{beatType}.yml</Monospace>
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
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.note"
              defaultMessage="You'll need to restart {beatType} after making this change."
              values={{
                beatType: beatType || UNDETECTED_BEAT_TYPE
              }}
            />
          </p>
        </EuiText>
      </Fragment>
    )
  };

  let migrationStatusStep = null;
  if (!product || !product.isFullyMigrated) {
    let status = null;
    if (hasCheckedStatus) {
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
          id="xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.partiallyMigratedStatusDescription"
          defaultMessage="Last internal collection occurred {secondsSinceLastInternalCollectionLabel} ago."
          values={{
            secondsSinceLastInternalCollectionLabel,
          }}
        />);
      }

      status = (
        <Fragment>
          <EuiSpacer size="m"/>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.monitoring.metricbeatMigration.beatsInstructions.partiallyMigratedStatusTitle',
              {
                defaultMessage: `We still see data coming from internal collection of this beat.`
              }
            )}
          >
            <p>
              <FormattedMessage
                id="xpack.monitoring.metricbeatMigration.beatsInstructions.partiallyMigratedStatusDescription"
                defaultMessage="Note that it can take up to {secondsAgo} seconds to detect, but
                we will continuously check every {timePeriod} seconds in the background."
                values={{
                  secondsAgo: meta.secondsAgo,
                  timePeriod: autoCheckIntervalInMs / 1000,
                }}
              />
            </p>
            <p>
              {lastInternallyCollectedMessage}
            </p>
          </EuiCallOut>
        </Fragment>
      );
    }

    let buttonLabel;
    if (checkingMigrationStatus) {
      buttonLabel = i18n.translate(
        'xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.checkingStatusButtonLabel',
        {
          defaultMessage: 'Checking...'
        }
      );
    } else {
      buttonLabel = i18n.translate(
        'xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.checkStatusButtonLabel',
        {
          defaultMessage: 'Check'
        }
      );
    }

    migrationStatusStep = {
      title: statusTitle,
      status: 'incomplete',
      children: (
        <Fragment>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate(
                    'xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.statusDescription',
                    {
                      defaultMessage: 'Check that no documents are coming from internal collection.'
                    }
                  )}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={checkForMigrationStatus} isDisabled={checkingMigrationStatus}>
                {buttonLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {status}
        </Fragment>
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
            'xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.fullyMigratedStatusTitle',
            {
              defaultMessage: 'Congratulations!'
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.fullyMigratedStatusDescription"
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
