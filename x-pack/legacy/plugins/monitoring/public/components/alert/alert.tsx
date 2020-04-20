/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { IUiSettingsClient } from 'kibana/public';
import { kfetch } from 'ui/kfetch';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiRange,
  EuiLink,
  EuiFormRow,
  EuiButton,
  EuiTitle,
  EuiFieldText,
  EuiBadge,
  EuiToolTip,
  EuiText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiAccordion,
} from '@elastic/eui';
import { Chart, LineSeries, ScaleType, Settings, TooltipType } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { AlertCpuUsageState } from '../../../../../../plugins/monitoring/server/alerts/types';
import { MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THRESHOLD } from '../../../../../../plugins/monitoring/common/constants';
// @ts-ignore
import { formatDateTimeLocal } from '../../../../../../plugins/monitoring/common/formatting';
// @ts-ignore
import { formatTimestampToDuration } from '../../../../../../plugins/monitoring/common/format_timestamp_to_duration';
// @ts-ignore
import { EuiMonitoringTable } from '../table';
// @ts-ignore
import { Logs } from '../logs';
// @ts-ignore
import { getReasonAsText } from '../logs/reason';

interface AlertStateInstancesUi {
  instanceId: string;
  muted: boolean;
  logs: any;
  meta: AlertStateInstancesUiMeta;
  state: AlertCpuUsageState;
  metrics: any[];
}

interface AlertStateInstancesLastScheduledActions {
  date: string;
  group: string;
}

interface AlertStateInstancesUiMeta {
  lastScheduledActions: AlertStateInstancesLastScheduledActions;
}

interface AlertStateUI {
  id: string;
  type: string;
  raw: any;
  throttle: string;
  threshold: number;
  instances: AlertStateInstancesUi[];
}

export interface AlertProps {
  alertState: AlertStateUI;
  uiSettings: IUiSettingsClient;
  refresh: () => {};
}

export const Alert: React.FC<AlertProps> = (props: AlertProps) => {
  const { alertState, uiSettings, refresh } = props;

  const [threshold, setThreshold] = React.useState<number>(alertState.threshold);
  const [isSavingConfiguration, setIsSavingConfiguration] = React.useState<boolean>(false);
  const [throttle, setThrottle] = React.useState<string>(alertState.throttle);
  const [isTableLoading, setIsTableLoading] = React.useState<boolean>(false);
  const [activeInstance, setActiveInstance] = React.useState<AlertStateInstancesUi | null>(null);

  async function saveConfiguration() {
    setIsSavingConfiguration(true);
    if (threshold !== alertState.threshold) {
      await uiSettings.set(MONITORING_CONFIG_ALERT_GUARD_RAIL_CPU_USAGE_THRESHOLD, threshold);
    }
    if (throttle !== alertState.throttle) {
      await kfetch({
        method: 'PUT',
        pathname: `/api/alert/${alertState.id}`,
        body: JSON.stringify({
          ...alertState.raw,
          throttle,
        }),
      });
    }
    await refresh();
    setIsSavingConfiguration(false);
  }

  async function mute(instanceId: string) {
    setIsTableLoading(true);
    await kfetch({
      method: 'POST',
      pathname: `/api/alert/${alertState.id}/alert_instance/${instanceId}/_mute`,
    });
    await refresh();
    setIsTableLoading(false);
  }

  async function unmute(instanceId: string) {
    setIsTableLoading(true);
    await kfetch({
      method: 'POST',
      pathname: `/api/alert/${alertState.id}/alert_instance/${instanceId}/_unmute`,
    });
    await refresh();
    setIsTableLoading(false);
  }

  const COLUMNS = [
    {
      name: i18n.translate('xpack.monitoring.alert.state.listing.column.cluster', {
        defaultMessage: 'Cluster',
      }),
      field: 'state.cluster.clusterName',
      render: (field: string, instance: AlertStateInstancesUi) => (
        <EuiLink href={`#/overview?_g=(cluster_uuid:${instance.state.cluster.clusterUuid})`}>
          {field}
        </EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.alert.state.listing.column.node', {
        defaultMessage: 'Node',
      }),
      field: 'state.nodeName',
      render: (field: string, instance: AlertStateInstancesUi) => (
        <EuiLink
          href={`#/elasticsearch/nodes/${instance.state.nodeId}?_g=(cluster_uuid:${instance.state.cluster.clusterUuid})`}
        >
          {field}
        </EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.monitoring.alert.state.listing.column.cpuUsage', {
        defaultMessage: 'CPU usage',
      }),
      width: '35%',
      field: 'state.cpuUsage',
      render: (field: string, instance: AlertStateInstancesUi) => {
        if (!instance.metrics) {
          return <EuiText>{field}%</EuiText>;
        }

        const chart = (
          <Chart>
            <Settings
              theme={{
                chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
                lineSeriesStyle: {
                  point: {
                    visible: false,
                  },
                },
              }}
              tooltip={TooltipType.None}
            />
            <LineSeries
              id="test"
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={[0]}
              yAccessors={[1]}
              data={instance.metrics}
            />
          </Chart>
        );

        return (
          <EuiFlexGroup>
            <EuiFlexItem>{chart}</EuiFlexItem>
            <EuiFlexItem grow={false}>{field}%</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.alert.state.listing.column.triggered', {
        defaultMessage: 'Triggered',
      }),
      field: 'state.ui.triggeredMS',
      render: (field: string) => {
        let timezone = uiSettings.get('dateFormat:tz');
        if (timezone === 'Browser') {
          timezone = moment.tz.guess() || 'utc';
        }
        const $date = moment.tz(field, timezone);
        return (
          <EuiToolTip position="top" content={$date.format()}>
            <EuiText>{$date.calendar()}</EuiText>
          </EuiToolTip>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.alert.state.listing.column.status', {
        defaultMessage: 'Status',
      }),
      sortable: false,
      render: (instance: AlertStateInstancesUi) => {
        if (instance.muted) {
          return (
            <EuiBadge iconType="bellSlash" color="danger">
              Muted
            </EuiBadge>
          );
        }
        return (
          <EuiBadge iconType="bell" color="primary">
            Active
          </EuiBadge>
        );
      },
    },
    // {
    //   name: i18n.translate('xpack.monitoring.alert.state.listing.column.lastAction', {
    //     defaultMessage: 'Last action',
    //   }),
    //   sortable: false,
    //   render: (instance: AlertStateInstancesUi) => {
    //     if (instance.muted) {
    //       return i18n.translate('xpack.monitoring.alert.state.not_available', {
    //         defaultMessage: 'N/A',
    //       });
    //     }
    //     const date = moment(instance.meta.lastScheduledActions.date);
    //     const absolute = formatDateTimeLocal(date, uiSettings.get('dateFormat:tz'));
    //     return (
    //       <EuiToolTip position="top" content={absolute}>
    //         <EuiText>
    //           {i18n.translate('xpack.monitoring.alert.state.lastAction', {
    //             defaultMessage: '{timeOfLastEvent} ago',
    //             values: {
    //               timeOfLastEvent: formatTimestampToDuration(+date, CALCULATE_DURATION_SINCE),
    //             },
    //           })}
    //         </EuiText>
    //       </EuiToolTip>
    //     );
    //   },
    // },
    // {
    //   name: i18n.translate('xpack.monitoring.alert.state.listing.column.nextAction', {
    //     defaultMessage: 'Next action',
    //   }),
    //   sortable: false,
    //   render: (instance: AlertStateInstancesUi) => {
    //     if (instance.muted) {
    //       return i18n.translate('xpack.monitoring.alert.state.not_available', {
    //         defaultMessage: 'N/A',
    //       });
    //     }

    //     const date = moment(instance.meta.lastScheduledActions.date).add(
    //       parseDuration(alertState.throttle),
    //       'ms'
    //     );
    //     const absolute = formatDateTimeLocal(date, uiSettings.get('dateFormat:tz'));

    //     return (
    //       <EuiToolTip position="top" content={absolute}>
    //         <EuiText>{date.fromNow()}</EuiText>
    //       </EuiToolTip>
    //     );
    //   },
    // },
    // {
    //   name: i18n.translate('xpack.monitoring.alert.state.listing.column.viewLogs', {
    //     defaultMessage: 'View logs',
    //   }),
    //   sortable: false,
    //   render: (instance: AlertStateInstancesUi) => {
    //     if (!instance.logs.enabled) {
    //       const reason = getReasonAsText(instance.logs.reason);
    //       const reasonText = (
    //         <EuiText>
    //           {reason.title}. {reason.message}
    //         </EuiText>
    //       );
    //       return (
    //         <EuiToolTip position="top" content={reasonText}>
    //           <EuiTextColor color="subdued">
    //             {i18n.translate('xpack.monitoring.alert.state.logsUnavailable', {
    //               defaultMessage: 'Logs unavailable',
    //             })}
    //           </EuiTextColor>
    //         </EuiToolTip>
    //       );
    //     }
    //     return <EuiLink onClick={() => setActiveInstance(instance)}>Click to view logs</EuiLink>;
    //   },
    // },
    {
      name: i18n.translate('xpack.monitoring.alert.state.listing.column.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: (instance: AlertStateInstancesUi) => {
            if (instance.muted) {
              return (
                <EuiButtonEmpty onClick={() => unmute(instance.instanceId)} iconType="bellSlash">
                  Unmute
                </EuiButtonEmpty>
              );
            }
            return (
              <EuiButtonEmpty onClick={() => mute(instance.instanceId)} iconType="bell">
                Mute
              </EuiButtonEmpty>
            );
          },
        },
        {
          render: (instance: AlertStateInstancesUi) => {
            const viewLogs = i18n.translate('xpack.monitoring.alert.state.viewlogs', {
              defaultMessage: 'View logs',
            });

            if (!instance.logs) {
              return (
                <EuiButtonEmpty disabled iconType="eyeClosed">
                  {viewLogs}
                </EuiButtonEmpty>
              );
            }

            if (!instance.logs.enabled) {
              const reason = getReasonAsText(instance.logs.reason);
              const reasonText = (
                <EuiText>
                  {reason.title}. {reason.message}
                </EuiText>
              );
              return (
                <EuiToolTip position="top" content={reasonText}>
                  <EuiButtonEmpty disabled iconType="eyeClosed">
                    {viewLogs}
                  </EuiButtonEmpty>
                </EuiToolTip>
              );
            }
            return (
              <EuiButtonEmpty onClick={() => setActiveInstance(instance)} iconType="eye">
                {viewLogs}
              </EuiButtonEmpty>
            );
          },
        },
      ],
    },
  ];

  function getContent() {
    if (!alertState) {
      return null;
    }

    if (alertState.instances.length === 0) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.alert.cpuUsage.notFiring', {
            defaultMessage: 'Good news! CPU usage looks good.',
          })}
          color="success"
          iconType="check"
        />
      );
    }

    return (
      <EuiMonitoringTable rows={alertState.instances} columns={COLUMNS} loading={isTableLoading} />
    );
  }

  function getLogsFlyout() {
    if (!activeInstance) {
      return null;
    }

    return (
      <EuiFlyout onClose={() => setActiveInstance(null)}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('xpack.monitoring.alert.logs.title', {
                defaultMessage: 'Logs',
              })}
            </h2>
          </EuiTitle>
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.monitoring.alert.logs.subtitle', {
                defaultMessage: 'Node {node} of cluster {cluster}',
                values: {
                  node: activeInstance.state.nodeName,
                  cluster: activeInstance.state.cluster.clusterName,
                },
              })}
            </p>
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <Logs
            logs={activeInstance.logs}
            nodeId={activeInstance.state.nodeId}
            clusterUuid={activeInstance.state.cluster.clusterUuid}
            renderTitle={false}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  return (
    <div>
      <EuiTitle>
        <h2>State</h2>
      </EuiTitle>
      <EuiSpacer />
      {getContent()}
      {getLogsFlyout()}
      <EuiSpacer />
      <EuiAccordion id="configuration" buttonContent="View/manage configuration">
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate('xpack.monitoring.alert.configuration.threshold.title', {
                defaultMessage: 'Threshold',
              })}
              fullWidth
              helpText={i18n.translate(
                'xpack.monitoring.alert.configuration.threshold.description',
                {
                  defaultMessage: 'If the CPU usage exceed this number, an alert will fire.',
                }
              )}
            >
              <EuiRange
                id="alertRange"
                min={-1}
                max={100}
                value={threshold}
                onChange={(e: any) => setThreshold(parseInt(e.target.value, 10))}
                showInput
                aria-label="An example of EuiRange"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate('xpack.monitoring.alert.configuration.throttle.title', {
                defaultMessage: 'Throttle',
              })}
              fullWidth
              helpText={i18n.translate(
                'xpack.monitoring.alert.configuration.throttle.description',
                {
                  defaultMessage: 'How often to fire an email',
                }
              )}
            >
              <EuiFieldText value={throttle} onChange={(e: any) => setThrottle(e.target.value)} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton
                type="submit"
                fill
                onClick={saveConfiguration}
                isDisabled={isSavingConfiguration}
              >
                {isSavingConfiguration
                  ? i18n.translate('xpack.monitoring.alert.configuration.saving', {
                      defaultMessage: 'Saving...',
                    })
                  : i18n.translate('xpack.monitoring.alert.configuration.saveThreshold', {
                      defaultMessage: 'Save',
                    })}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </div>
  );
};
