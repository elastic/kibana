/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { IntegrationLink } from './integration_link';
import {
  getApmHref,
  getMetricsContainerHref,
  getMetricsIpHref,
  getMetricsKubernetesHref,
  getLoggingContainerHref,
  getLoggingIpHref,
  getLoggingKubernetesHref,
} from '../../lib/helper';
import { MonitorSummary } from '../../../common/graphql/types';

interface IntegrationGroupProps {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isMetricsAvailable: boolean;
  isLogsAvailable: boolean;
  summary: MonitorSummary;
}

export const IntegrationGroup = ({
  basePath,
  dateRangeStart,
  dateRangeEnd,
  isApmAvailable,
  isMetricsAvailable,
  isLogsAvailable,
  summary,
}: IntegrationGroupProps) => {
  const domain = get<string>(summary, 'state.url.domain', '');
  const podUid = get<string | undefined>(summary, 'state.checks[0].kubernetes.pod.uid', undefined);
  const containerId = get<string | undefined>(summary, 'state.checks[0].container.id', undefined);
  const ip = get<string | undefined>(summary, 'state.checks[0].monitor.ip', undefined);
  return isApmAvailable || isMetricsAvailable || isLogsAvailable ? (
    <EuiFlexGroup direction="column">
      {isApmAvailable ? (
        <EuiFlexItem>
          <IntegrationLink
            ariaLabel={i18n.translate('xpack.uptime.apmIntegrationAction.description', {
              defaultMessage: 'Search APM for this monitor',
              description:
                'This value is shown to users when they hover over an icon that will take them to the APM app.',
            })}
            href={getApmHref(summary, basePath, dateRangeStart, dateRangeEnd)}
            iconType="apmApp"
            message={i18n.translate('xpack.uptime.apmIntegrationAction.text', {
              defaultMessage: 'Check APM for domain',
              description:
                'A message explaining that when the user clicks the associated link, it will navigate to the APM app and search for the selected domain',
            })}
            tooltipContent={i18n.translate(
              'xpack.uptime.monitorList.observabilityIntegrationsColumn.apmIntegrationLink.tooltip',
              {
                defaultMessage: 'Click here to check APM for the domain "{domain}".',
                description:
                  'A messsage shown in a tooltip explaining that the nested anchor tag will navigate to the APM app and search for the given URL domain.',
                values: {
                  domain,
                },
              }
            )}
          />
        </EuiFlexItem>
      ) : null}
      {isMetricsAvailable ? (
        <React.Fragment>
          <EuiFlexItem>
            <IntegrationLink
              ariaLabel={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.ip.ariaLabel',
                {
                  defaultMessage: `Check Infrastructure UI for this montor's ip address`,
                  description: 'This value is shown as the aria label value for screen readers.',
                }
              )}
              href={getMetricsIpHref(summary, basePath)}
              iconType="metricsApp"
              message={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.ip.message',
                {
                  defaultMessage: 'Show host metrics',
                  description: `A message explaining that this link will take the user to the Infrastructure UI, filtered for this monitor's IP Address`,
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.ip.tooltip',
                {
                  defaultMessage: 'Check Infrastructure UI for the IP "{ip}"',
                  values: {
                    ip,
                  },
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <IntegrationLink
              ariaLabel={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.kubernetes.description',
                {
                  defaultMessage: `Check Infrastructure UI for this monitor's pod UID`,
                  description: 'This value is shown as the aria label value for screen readers.',
                }
              )}
              href={getMetricsKubernetesHref(summary, basePath)}
              iconType="metricsApp"
              message={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.kubernetes.message',
                {
                  defaultMessage: 'Show pod metrics',
                  description:
                    'A message explaining that this link will take the user to the Infrastructure UI filtered for the monitor Pod UID.',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.kubernetes.tooltip',
                {
                  defaultMessage: 'Check Infrastructure UI for pod UID "{podUid}".',
                  values: {
                    podUid,
                  },
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <IntegrationLink
              ariaLabel={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.docker.description',
                {
                  defaultMessage: `Check Infrastructure UI for this monitor's container ID`,
                }
              )}
              href={getMetricsContainerHref(summary, basePath)}
              iconType="metricsApp"
              message={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.container.message',
                {
                  defaultMessage: 'Show container metrics',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.uptime.monitorList.infraIntegrationAction.docker.tooltip',
                {
                  defaultMessage: 'Check Infrastructure UI for container ID "{containerId}"',
                  values: {
                    containerId,
                  },
                }
              )}
            />
          </EuiFlexItem>
        </React.Fragment>
      ) : null}
      {isLogsAvailable ? (
        <React.Fragment>
          <EuiFlexItem>
            <IntegrationLink
              ariaLabel={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.ip.description',
                {
                  defaultMessage: `Check Logging UI for this monitor's ip address`,
                  description: 'This value is shown as the aria label for screen readers.',
                }
              )}
              href={getLoggingIpHref(summary, basePath)}
              iconType="logsApp"
              message={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.ip.message',
                {
                  defaultMessage: 'Show host logs',
                  description: `A message explaining that this link will take the user to the Infrastructure UI filtered for the monitor's IP Address`,
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.ip.tooltip',
                { defaultMessage: 'Check Logging UI for the IP "{ip}"', values: { ip } }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <IntegrationLink
              ariaLabel={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.kubernetes.ariaLabel',
                {
                  defaultMessage: 'Show pod logs',
                }
              )}
              href={getLoggingKubernetesHref(summary, basePath)}
              iconType="logsApp"
              message={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.kubernetes.message',
                {
                  defaultMessage: 'Show pod logs',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.kubernetes.tooltip',
                {
                  defaultMessage: 'Check for logs for pod UID "{podUid}"',
                  values: {
                    podUid,
                  },
                }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <IntegrationLink
              ariaLabel={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.container.id',
                {
                  defaultMessage: 'Show container logs',
                }
              )}
              href={getLoggingContainerHref(summary, basePath)}
              iconType="logsApp"
              message={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.container.message',
                {
                  defaultMessage: 'Show container logs',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.uptime.monitorList.loggingIntegrationAction.container.tooltip',
                {
                  defaultMessage: 'Check Logging UI for container ID "{containerId}"',
                  values: {
                    containerId,
                  },
                }
              )}
            />
          </EuiFlexItem>
        </React.Fragment>
      ) : null}
    </EuiFlexGroup>
  ) : (
    <FormattedMessage
      defaultMessage="No integrated applications available"
      description="This message is shown when no applications that Uptime links to are enabled in the current space"
      id="xpack.uptime.monitorList.integrationGroup.emptyMessage"
    />
  );
};
