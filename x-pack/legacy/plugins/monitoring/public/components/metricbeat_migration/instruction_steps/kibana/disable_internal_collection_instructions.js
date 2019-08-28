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
import { statusTitle } from './common_kibana_instructions';

export function getKibanaInstructionsForDisablingInternalCollection(product, meta, {
  checkForMigrationStatus,
  checkingMigrationStatus,
  hasCheckedStatus,
  autoCheckIntervalInMs,
}) {
  let restartWarning = null;
  if (product.isPrimary) {
    restartWarning = (
      <Fragment>
        <EuiSpacer size="s"/>
        <EuiCallOut
          title={i18n.translate(
            'xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.restartWarningTitle',
            {
              defaultMessage: 'Warning'
            }
          )}
          color="warning"
          iconType="help"
        >
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.restartNote"
                defaultMessage="This step requires you to restart the Kibana server.
                Expect to see errors until the server is running again."
              />
            </p>
          </EuiText>
        </EuiCallOut>
      </Fragment>
    );
  }

  const disableInternalCollectionStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.title', {
      defaultMessage: 'Disable internal collection of Kibana monitoring metrics'
    }),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.description"
              defaultMessage="Add the following setting in the Kibana configuration file ({file}):"
              values={{
                file: (
                  <Monospace>kibana.yml</Monospace>
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
          xpack.monitoring.kibana.collection.enabled: false
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.note"
              defaultMessage="Leave the {config} set to its default value ({defaultValue})."
              values={{
                config: (
                  <Monospace>xpack.monitoring.enabled</Monospace>
                ),
                defaultValue: (
                  <Monospace>true</Monospace>
                )
              }}
            />
          </p>
        </EuiText>
        {restartWarning}
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
          id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.partiallyMigratedStatusDescription"
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
            title={i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.partiallyMigratedStatusTitle',
              {
                defaultMessage: `We still see data coming from internal collection of Kibana.`
              }
            )}
          >
            <p>
              <FormattedMessage
                id="xpack.monitoring.metricbeatMigration.kibanaInstructions.partiallyMigratedStatusDescription"
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
        'xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.checkingStatusButtonLabel',
        {
          defaultMessage: 'Checking...'
        }
      );
    } else {
      buttonLabel = i18n.translate(
        'xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.checkStatusButtonLabel',
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
                    'xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.statusDescription',
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
            'xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.fullyMigratedStatusTitle',
            {
              defaultMessage: 'Congratulations!'
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.fullyMigratedStatusDescription"
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
