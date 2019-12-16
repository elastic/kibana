/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCodeBlock, EuiCallOut, EuiText } from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { getDisableStatusStep } from '../common_instructions';

export function getKibanaInstructionsForDisablingInternalCollection(product, meta) {
  let restartWarning = null;
  if (product.isPrimary) {
    restartWarning = (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiCallOut
          title={i18n.translate(
            'xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.restartWarningTitle',
            {
              defaultMessage: 'This step requires you to restart the Kibana server',
            }
          )}
          color="warning"
          iconType="help"
        >
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.restartNote"
                defaultMessage="Expect errors until the server is running again."
              />
            </p>
          </EuiText>
        </EuiCallOut>
      </Fragment>
    );
  }

  const disableInternalCollectionStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.title',
      {
        defaultMessage: 'Disable self monitoring of Kibana monitoring metrics',
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.description"
              defaultMessage="Add this setting to {file}."
              values={{
                file: <Monospace>kibana.yml</Monospace>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock isCopyable language="bash">
          xpack.monitoring.kibana.collection.enabled: false
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.disableInternalCollection.note"
              defaultMessage="For {config}, leave the default value of ({defaultValue})."
              values={{
                config: <Monospace>xpack.monitoring.enabled</Monospace>,
                defaultValue: <Monospace>true</Monospace>,
              }}
            />
          </p>
        </EuiText>
        {restartWarning}
      </Fragment>
    ),
  };

  const migrationStatusStep = getDisableStatusStep(product, meta);

  return [disableInternalCollectionStep, migrationStatusStep];
}
