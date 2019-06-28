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
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiText
} from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { statusTitle } from './common_kibana_instructions';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

export function getKibanaInstructionsForEnablingMetricbeat(product, _meta, {
  esMonitoringUrl,
  hasCheckedStatus,
  checkingMigrationStatus,
  checkForMigrationStatus,
  autoCheckIntervalInMs
}) {
  const securitySetup = (
    <Fragment>
      <EuiSpacer size="m"/>
      <EuiCallOut
        color="warning"
        iconType="help"
        title={(
          <EuiText>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.metricbeatSecuritySetup"
              defaultMessage="If security features are enabled, there may be more setup required.{link}"
              values={{
                link: (
                  <Fragment>
                    {` `}
                    <EuiLink
                      href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/reference/${DOC_LINK_VERSION}/configuring-metricbeat.html`}
                      target="_blank"
                    >
                      <FormattedMessage
                        id="xpack.monitoring.metricbeatMigration.kibanaInstructions.metricbeatSecuritySetupLinkText"
                        defaultMessage="View more information."
                      />
                    </EuiLink>
                  </Fragment>
                )
              }}
            />
          </EuiText>
        )}
      />
    </Fragment>
  );
  const installMetricbeatStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.installMetricbeatTitle', {
      defaultMessage: 'Install Metricbeat on the same server as Kibana'
    }),
    children: (
      <EuiText>
        <p>
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/metricbeat-installation.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.installMetricbeatLinkText"
              defaultMessage="Follow the instructions here"
            />
          </EuiLink>
        </p>
      </EuiText>
    )
  };

  const enableMetricbeatModuleStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.enableMetricbeatModuleTitle', {
      defaultMessage: 'Enable and configure the Kibana x-pack module in Metricbeat'
    }),
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
          language="bash"
        >
          metricbeat modules enable kibana-xpack
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.enableMetricbeatModuleDescription"
              defaultMessage="By default the module will collect Kibana monitoring metrics from http://localhost:5601. If the local Kibana instance has a different address, you must specify it via the {hosts} setting in the {file} file."
              values={{
                hosts: (
                  <Monospace>hosts</Monospace>
                ),
                file: (
                  <Monospace>modules.d/kibana-xpack.yml</Monospace>
                )
              }}
            />
          </p>
        </EuiText>
        {securitySetup}
      </Fragment>
    )
  };

  const configureMetricbeatStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.configureMetricbeatTitle', {
      defaultMessage: 'Configure Metricbeat to send to the monitoring cluster'
    }),
    children: (
      <Fragment>
        <EuiText>
          <FormattedMessage
            id="xpack.monitoring.metricbeatMigration.kibanaInstructions.configureMetricbeatDescription"
            defaultMessage="Make these changes in your {file}."
            values={{
              file: (
                <Monospace>metricbeat.yml</Monospace>
              )
            }}
          />
        </EuiText>
        <EuiSpacer size="s"/>
        <EuiCodeBlock
          isCopyable
        >
          {`output.elasticsearch:
  hosts: ["${esMonitoringUrl}"] ## Monitoring cluster

  # Optional protocol and basic auth credentials.
  #protocol: "https"
  #username: "elastic"
  #password: "changeme"
`}
        </EuiCodeBlock>
        {securitySetup}
      </Fragment>

    )
  };

  const startMetricbeatStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.startMetricbeatTitle', {
      defaultMessage: 'Start Metricbeat'
    }),
    children: (
      <EuiText>
        <p>
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/metricbeat-starting.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.startMetricbeatLinkText"
              defaultMessage="Follow the instructions here"
            />
          </EuiLink>
        </p>
      </EuiText>
    )
  };

  let migrationStatusStep = null;
  if (product.isInternalCollector) {
    let status = null;
    if (hasCheckedStatus) {
      status = (
        <Fragment>
          <EuiSpacer size="m"/>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.isInternalCollectorStatusTitle', {
              defaultMessage: `We have not detected any monitoring data coming from Metricbeat for this Kibana.
              We will continuously check every {timePeriod} seconds in the background.`,
              values: {
                timePeriod: autoCheckIntervalInMs / 1000,
              }
            })}
          />
        </Fragment>
      );
    }

    let buttonLabel;
    if (checkingMigrationStatus) {
      buttonLabel = i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.checkingStatusButtonLabel', {
        defaultMessage: 'Checking for data...'
      });
    } else {
      buttonLabel = i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.checkStatusButtonLabel', {
        defaultMessage: 'Check for data'
      });
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
                  {i18n.translate('xpack.monitoring.metricbeatMigration.kibanaInstructions.statusDescription', {
                    defaultMessage: 'Check that data is received from the Metricbeat'
                  })}
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
  else if (product.isPartiallyMigrated || product.isFullyMigrated) {
    migrationStatusStep = {
      title: statusTitle,
      status: 'complete',
      children: (
        <EuiCallOut
          size="s"
          color="success"
          title={i18n.translate(
            'xpack.monitoring.metricbeatMigration.kibanaInstructions.fullyMigratedStatusTitle',
            {
              defaultMessage: 'Congratulations!'
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.kibanaInstructions.fullyMigratedStatusDescription"
              defaultMessage="We are now seeing monitoring data shipping from Metricbeat!"
            />
          </p>
        </EuiCallOut>
      )
    };
  }

  return [
    installMetricbeatStep,
    enableMetricbeatModuleStep,
    configureMetricbeatStep,
    startMetricbeatStep,
    migrationStatusStep
  ];
}
