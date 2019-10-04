/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Agent } from '../../../common/types/domain_data';
import { formatRelativeDate } from '../../utils/date';
import { AgentHealth } from '../agent_health';

const MAX_METADATA = 5;
const PREFERRED_METADATA = ['ip', 'system', 'region', 'memory'];

function getMetadataTitle(key: string): string {
  switch (key) {
    case 'ip':
      return i18n.translate('xpack.fleet.agentMetadata.ipLabel', {
        defaultMessage: 'IP Adress',
      });
    case 'system':
      return i18n.translate('xpack.fleet.agentMetadata.systemLabel', {
        defaultMessage: 'System',
      });
    case 'region':
      return i18n.translate('xpack.fleet.agentMetadata.regionLabel', {
        defaultMessage: 'Region',
      });
    case 'memory':
      return i18n.translate('xpack.fleet.agentMetadata.memoryLabel', {
        defaultMessage: 'Memory',
      });
    default:
      return key;
  }
}

export const AgentDetailSection: SFC<{ agent: Agent }> = ({ agent }) => {
  const mapMetadata = (obj: { [key: string]: string } | undefined) => {
    return Object.keys(obj || {}).map(key => ({
      key,
      value: obj ? obj[key] : '',
    }));
  };

  const metadataItems = mapMetadata(agent.local_metadata)
    .concat(mapMetadata(agent.user_provided_metadata))
    .filter(item => PREFERRED_METADATA.indexOf(item.key) >= 0)
    .map(item => ({
      title: getMetadataTitle(item.key),
      description: item.value,
    }))
    .slice(0, MAX_METADATA);

  const items = [
    {
      title: i18n.translate('xpack.fleet.agentDetails.idLabel', {
        defaultMessage: 'Agent ID',
      }),
      description: agent.id,
    },
    {
      title: i18n.translate('xpack.fleet.agentDetails.typeLabel', {
        defaultMessage: 'Agent Type',
      }),
      description: agent.type,
    },
    {
      title: i18n.translate('xpack.fleet.agentDetails.lastCheckinLabel', {
        defaultMessage: 'Last checkin',
      }),
      description: agent.last_checkin ? formatRelativeDate(agent.last_checkin) : '-',
    },
  ].concat(metadataItems);

  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage id="xpack.fleet.agentDetails.title" defaultMessage="Agent Detail" />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AgentHealth agent={agent} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiDescriptionList type="column" compressed listItems={items} />
    </div>
  );
};
