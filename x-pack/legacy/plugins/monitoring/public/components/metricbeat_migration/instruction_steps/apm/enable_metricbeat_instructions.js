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
  EuiCallOut,
  EuiText
} from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { statusTitle } from './common_apm_instructions';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

export function getApmInstructionsForEnablingMetricbeat(product, _meta, {
  esMonitoringUrl,
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
              id="xpack.monitoring.metricbeatMigration.apmInstructions.metricbeatSecuritySetup"
              defaultMessage="If security features are enabled, there may be more setup required.{link}"
              values={{
                link: (
                  <Fragment>
                    {` `}
                    <EuiLink
                      href={`${ELASTIC_WEBSITE_URL}guide/en/apm/reference/${DOC_LINK_VERSION}/configuring-metricbeat.html`}
                      target="_blank"
                    >
                      <FormattedMessage
                        id="xpack.monitoring.metricbeatMigration.apmInstructions.metricbeatSecuritySetupLinkText"
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
    title: i18n.translate('xpack.monitoring.metricbeatMigration.apmInstructions.installMetricbeatTitle', {
      defaultMessage: 'Install Metricbeat on the same server as the APM server'
    }),
    children: (
      <EuiText>
        <p>
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/apm/metricbeat/${DOC_LINK_VERSION}/metricbeat-installation.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.installMetricbeatLinkText"
              defaultMessage="Follow the instructions here"
            />
          </EuiLink>
        </p>
      </EuiText>
    )
  };

  const enableMetricbeatModuleStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.apmInstructions.enableMetricbeatModuleTitle', {
      defaultMessage: 'Enable and configure the Beat x-pack module in Metricbeat'
    }),
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
          language="bash"
        >
          metricbeat modules enable beat-xpack
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.enableMetricbeatModuleDescription"
              defaultMessage="By default the module will collect APM server monitoring metrics from http://localhost:5066. If the local APM server has a different address, you must specify it via the {hosts} setting in the {file} file."
              values={{
                hosts: (
                  <Monospace>hosts</Monospace>
                ),
                file: (
                  <Monospace>modules.d/beat-xpack.yml</Monospace>
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
    title: i18n.translate('xpack.monitoring.metricbeatMigration.apmInstructions.configureMetricbeatTitle', {
      defaultMessage: 'Configure Metricbeat to send to the monitoring cluster'
    }),
    children: (
      <Fragment>
        <EuiText>
          <FormattedMessage
            id="xpack.monitoring.metricbeatMigration.apmInstructions.configureMetricbeatDescription"
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
    title: i18n.translate('xpack.monitoring.metricbeatMigration.apmInstructions.startMetricbeatTitle', {
      defaultMessage: 'Start Metricbeat'
    }),
    children: (
      <EuiText>
        <p>
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/apm/metricbeat/${DOC_LINK_VERSION}/metricbeat-starting.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.startMetricbeatLinkText"
              defaultMessage="Follow the instructions here"
            />
          </EuiLink>
        </p>
      </EuiText>
    )
  };

  let migrationStatusStep = null;
  if (product.isInternalCollector || product.isNetNewUser) {
    migrationStatusStep = {
      title: statusTitle,
      status: 'incomplete',
      children: (
        <EuiCallOut
          size="s"
          color="warning"
          title={i18n.translate('xpack.monitoring.metricbeatMigration.apmInstructions.isInternalCollectorStatusTitle', {
            defaultMessage: `We have not detected any monitoring data coming from Metricbeat for this APM server.
            We will continuously check in the background.`,
          })}
        />
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
            'xpack.monitoring.metricbeatMigration.apmInstructions.fullyMigratedStatusTitle',
            {
              defaultMessage: 'Congratulations!'
            }
          )}
        >
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.apmInstructions.fullyMigratedStatusDescription"
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
