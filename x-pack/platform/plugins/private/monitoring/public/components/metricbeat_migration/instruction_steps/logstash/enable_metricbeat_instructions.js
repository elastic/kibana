/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCodeBlock, EuiLink, EuiText } from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n-react';
import { Legacy } from '../../../../legacy_shims';
import { getMigrationStatusStep, getSecurityStep } from '../common_instructions';

export function getLogstashInstructionsForEnablingMetricbeat(product, _meta, { esMonitoringUrl }) {
  const logstashUrl = Legacy.shims.docLinks.links.monitoring.monitorLogstash;
  const metricbeatInstallUrl = Legacy.shims.docLinks.links.metricbeat.install;
  const metricbeatStartUrl = Legacy.shims.docLinks.links.metricbeat.start;
  const securitySetup = getSecurityStep(logstashUrl);

  const installMetricbeatStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.logstashInstructions.installMetricbeatTitle',
      {
        defaultMessage: 'Install Metricbeat on the same server as Logstash',
      }
    ),
    children: (
      <EuiText>
        <p>
          <EuiLink href={metricbeatInstallUrl} target="_blank">
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.logstashInstructions.installMetricbeatLinkText"
              defaultMessage="Follow the instructions here."
            />
          </EuiLink>
        </p>
      </EuiText>
    ),
  };

  const enableMetricbeatModuleStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.logstashInstructions.enableMetricbeatModuleTitle',
      {
        defaultMessage: 'Enable and configure the Logstash x-pack module in Metricbeat',
      }
    ),
    children: (
      <Fragment>
        <EuiCodeBlock isCopyable language="bash">
          metricbeat modules enable logstash-xpack
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.logstashInstructions.enableMetricbeatModuleDescription"
              defaultMessage="By default the module will collect Logstash monitoring metrics from http://localhost:9600. If the local Logstash instance has a different address, you must specify it via the {hosts} setting in the {file} file."
              values={{
                hosts: <Monospace>hosts</Monospace>,
                file: <Monospace>modules.d/logstash-xpack.yml</Monospace>,
              }}
            />
          </p>
        </EuiText>
        {securitySetup}
      </Fragment>
    ),
  };

  const configureMetricbeatStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.logstashInstructions.configureMetricbeatTitle',
      {
        defaultMessage: 'Configure Metricbeat to send to the monitoring cluster',
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <FormattedMessage
            id="xpack.monitoring.metricbeatMigration.logstashInstructions.configureMetricbeatDescription"
            defaultMessage="Make these changes in your {file}."
            values={{
              file: <Monospace>metricbeat.yml</Monospace>,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock isCopyable>
          {`output.elasticsearch:
  hosts: [${esMonitoringUrl}] ## Monitoring cluster

  # Optional protocol and basic auth credentials.
  #protocol: "https"
  #username: "elastic"
  #password: "changeme"
`}
        </EuiCodeBlock>
        {securitySetup}
      </Fragment>
    ),
  };

  const startMetricbeatStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.logstashInstructions.startMetricbeatTitle',
      {
        defaultMessage: 'Start Metricbeat',
      }
    ),
    children: (
      <EuiText>
        <p>
          <EuiLink href={metricbeatStartUrl} target="_blank">
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.logstashInstructions.startMetricbeatLinkText"
              defaultMessage="Follow the instructions here."
            />
          </EuiLink>
        </p>
      </EuiText>
    ),
  };

  const migrationStatusStep = getMigrationStatusStep(product);

  return [
    installMetricbeatStep,
    enableMetricbeatModuleStep,
    configureMetricbeatStep,
    startMetricbeatStep,
    migrationStatusStep,
  ];
}
