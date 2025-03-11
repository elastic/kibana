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
import { getSecurityStep, getMigrationStatusStep } from '../common_instructions';

export function getElasticsearchInstructionsForEnablingMetricbeat(
  product,
  _meta,
  { esMonitoringUrl }
) {
  const elasticsearchUrl = Legacy.shims.docLinks.links.monitoring.monitorElasticsearch;
  const metricbeatInstallUrl = Legacy.shims.docLinks.links.metricbeat.install;
  const metricbeatStartUrl = Legacy.shims.docLinks.links.metricbeat.start;
  const securitySetup = getSecurityStep(elasticsearchUrl);

  const installMetricbeatStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.elasticsearchInstructions.installMetricbeatTitle',
      {
        defaultMessage: 'Install Metricbeat on the same server as Elasticsearch',
      }
    ),
    children: (
      <EuiText>
        <p>
          <EuiLink href={metricbeatInstallUrl} target="_blank">
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.installMetricbeatLinkText"
              defaultMessage="Follow these instructions."
            />
          </EuiLink>
        </p>
      </EuiText>
    ),
  };

  const enableMetricbeatModuleStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.elasticsearchInstructions.enableMetricbeatModuleTitle',
      {
        defaultMessage: 'Enable and configure the Elasticsearch x-pack module in Metricbeat',
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <p>
            {i18n.translate(
              'xpack.monitoring.metricbeatMigration.elasticsearchInstructions.enableMetricbeatModuleInstallDirectory',
              {
                defaultMessage: 'From the installation directory, run:',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock isCopyable language="bash">
          metricbeat modules enable elasticsearch-xpack
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.enableMetricbeatModuleDescription"
              defaultMessage="By default the module collects Elasticsearch metrics from {url}.
              If the local server has a different address, add it to the hosts setting in {module}."
              values={{
                module: <Monospace>modules.d/elasticsearch-xpack.yml</Monospace>,
                url: <Monospace>http://localhost:9200</Monospace>,
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
      'xpack.monitoring.metricbeatMigration.elasticsearchInstructions.configureMetricbeatTitle',
      {
        defaultMessage: 'Configure Metricbeat to send data to the monitoring cluster',
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <FormattedMessage
            id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.configureMetricbeatDescription"
            defaultMessage="Modify {file} to set the connection information."
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
      'xpack.monitoring.metricbeatMigration.elasticsearchInstructions.startMetricbeatTitle',
      {
        defaultMessage: 'Start Metricbeat',
      }
    ),
    children: (
      <EuiText>
        <p>
          <EuiLink href={metricbeatStartUrl} target="_blank">
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.startMetricbeatLinkText"
              defaultMessage="Follow these instructions."
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
