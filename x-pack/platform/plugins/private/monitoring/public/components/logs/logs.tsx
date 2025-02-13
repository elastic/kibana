/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent, useContext } from 'react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { upperFirst } from 'lodash';
import { EuiBasicTable, EuiTitle, EuiSpacer, EuiText, EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { Reason, type IReason } from './reason';
import { formatDateTimeLocal } from '../../../common/formatting';
import { Legacy } from '../../legacy_shims';
import { ExternalConfigContext } from '../../application/contexts/external_config_context';
import { MonitoringStartServices } from '../../types';

interface LogsProps {
  logs: {
    logs?: Array<{
      timestamp: string;
      component: string;
      level: string;
      type: string;
      node: string;
      message: string;
    }>;
    enabled: boolean;
    limit: number;
    reason?: IReason;
  };
  nodeId?: string;
  indexUuid?: string;
  clusterUuid?: string;
}

interface LogsContentProps extends LogsProps {
  sharePlugin: SharePluginStart;
  logsIndices: string;
}

const getFormattedDateTimeLocal = (timestamp: number | Date) => {
  const timezone = Legacy.shims.uiSettings?.get('dateFormat:tz');
  return formatDateTimeLocal(timestamp, timezone);
};

const columnTimestampTitle = i18n.translate('xpack.monitoring.logs.listing.timestampTitle', {
  defaultMessage: 'Timestamp',
});

const columnLevelTitle = i18n.translate('xpack.monitoring.logs.listing.levelTitle', {
  defaultMessage: 'Level',
});

const columnTypeTitle = i18n.translate('xpack.monitoring.logs.listing.typeTitle', {
  defaultMessage: 'Type',
});

const columnMessageTitle = i18n.translate('xpack.monitoring.logs.listing.messageTitle', {
  defaultMessage: 'Message',
});

const columnComponentTitle = i18n.translate('xpack.monitoring.logs.listing.componentTitle', {
  defaultMessage: 'Component',
});

const columnNodeTitle = i18n.translate('xpack.monitoring.logs.listing.nodeTitle', {
  defaultMessage: 'Node',
});

const columns = [
  {
    field: 'timestamp',
    name: columnTimestampTitle,
    width: '12%',
    render: (timestamp: number | Date) => getFormattedDateTimeLocal(timestamp),
  },
  {
    field: 'level',
    name: columnLevelTitle,
    width: '5%',
  },
  {
    field: 'type',
    name: columnTypeTitle,
    width: '10%',
    render: (type: string) => upperFirst(type),
  },
  {
    field: 'message',
    name: columnMessageTitle,
    width: '55%',
  },
  {
    field: 'component',
    name: columnComponentTitle,
    width: '18%',
  },
];

const clusterColumns = [
  {
    field: 'timestamp',
    name: columnTimestampTitle,
    width: '12%',
    render: (timestamp: number | Date) => getFormattedDateTimeLocal(timestamp),
  },
  {
    field: 'level',
    name: columnLevelTitle,
    width: '5%',
  },
  {
    field: 'type',
    name: columnTypeTitle,
    width: '10%',
    render: (type: string) => upperFirst(type),
  },
  {
    field: 'message',
    name: columnMessageTitle,
    width: '45%',
  },
  {
    field: 'component',
    name: columnComponentTitle,
    width: '15%',
  },
  {
    field: 'node',
    name: columnNodeTitle,
    width: '13%',
  },
];

function getDiscoverLink(
  clusterUuid?: string,
  nodeId?: string,
  indexUuid?: string,
  sharePlugin?: SharePluginStart,
  logsIndices?: string
) {
  const params = [];
  if (clusterUuid) {
    params.push(`elasticsearch.cluster.uuid:${clusterUuid}`);
  }
  if (nodeId) {
    params.push(`elasticsearch.node.id:${nodeId}`);
  }
  if (indexUuid) {
    params.push(`elasticsearch.index.name:${indexUuid}`);
  }

  const filter = params.join(' and ');
  const discoverLocator = sharePlugin?.url.locators.get('DISCOVER_APP_LOCATOR');

  const base = discoverLocator?.getRedirectUrl({
    dataViewSpec: {
      id: logsIndices,
      title: logsIndices,
    },
    query: {
      language: 'kuery',
      query: filter,
    },
  });

  return base;
}

export const Logs = (props: LogsProps) => {
  const {
    services: { share },
  } = useKibana<MonitoringStartServices>();
  const externalConfig = useContext(ExternalConfigContext);
  return <LogsContent sharePlugin={share} logsIndices={externalConfig.logsIndices} {...props} />;
};

export class LogsContent extends PureComponent<LogsContentProps> {
  renderLogs() {
    const {
      logs: { enabled, logs },
      nodeId,
      indexUuid,
    } = this.props;
    if (!enabled) {
      return null;
    }

    return (
      <EuiBasicTable items={logs || []} columns={nodeId || indexUuid ? columns : clusterColumns} />
    );
  }

  renderNoLogs() {
    const {
      logs: { enabled, reason },
    } = this.props;
    if (enabled) {
      return null;
    }

    return <Reason reason={reason} />;
  }

  renderCallout() {
    const { capabilities: uiCapabilities, kibanaServices } = Legacy.shims;
    const show = uiCapabilities.discover_v2 && uiCapabilities.discover_v2.show;

    const {
      logs: { enabled },
      nodeId,
      clusterUuid,
      indexUuid,
      sharePlugin,
      logsIndices,
    } = this.props;

    if (!enabled || !show) {
      return null;
    }
    const discoverLink = getDiscoverLink(clusterUuid, nodeId, indexUuid, sharePlugin, logsIndices);

    return discoverLink ? (
      <EuiCallOut
        size="m"
        title={i18n.translate('xpack.monitoring.logs.listing.calloutTitle', {
          defaultMessage: 'Want to see more log entries?',
        })}
        iconType="logsApp"
      >
        <RedirectAppLinks coreStart={kibanaServices}>
          <FormattedMessage
            id="xpack.monitoring.logs.listing.linkText"
            defaultMessage="Visit {link} to dive deeper."
            values={{
              link: (
                <EuiLink href={discoverLink}>
                  {i18n.translate('xpack.monitoring.logs.listing.calloutLinkText', {
                    defaultMessage: 'Discover',
                  })}
                </EuiLink>
              ),
            }}
          />
        </RedirectAppLinks>
      </EuiCallOut>
    ) : null;
  }

  render() {
    const {
      nodeId,
      indexUuid,
      logs: { limit },
    } = this.props;

    let description;

    if (nodeId) {
      description = i18n.translate('xpack.monitoring.logs.listing.nodePageDescription', {
        defaultMessage:
          'Showing the most recent log entries for this node, up to {limit} total log entries.',
        values: {
          limit,
        },
      });
    } else if (indexUuid) {
      description = i18n.translate('xpack.monitoring.logs.listing.indexPageDescription', {
        defaultMessage:
          'Showing the most recent log entries for this index, up to {limit} total log entries.',
        values: {
          limit,
        },
      });
    } else {
      description = i18n.translate('xpack.monitoring.logs.listing.clusterPageDescription', {
        defaultMessage:
          'Showing the most recent log entries for this cluster, up to {limit} total log entries.',
        values: {
          limit,
        },
      });
    }

    return (
      <div>
        <EuiTitle>
          <h1>
            {i18n.translate('xpack.monitoring.logs.listing.pageTitle', {
              defaultMessage: 'Recent Log Entries',
            })}
          </h1>
        </EuiTitle>
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {this.renderLogs()}
        {this.renderNoLogs()}
        <EuiSpacer size="m" />
        {this.renderCallout()}
      </div>
    );
  }
}
