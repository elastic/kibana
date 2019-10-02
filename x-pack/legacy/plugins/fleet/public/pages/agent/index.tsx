/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiInMemoryTable,
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FrontendLibs } from '../../lib/types';

interface RouterProps {
  libs: FrontendLibs;
}

export const AgentListPage: React.SFC<RouterProps> = ({ libs }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<any[]>([]);

  const fetchAgents = async () => {
    setIsLoading(true);
    setAgents(await libs.agents.getAll());
    setIsLoading(false);
  };

  // Load agents
  useEffect(() => {
    fetchAgents();
  }, []);

  // Some agents retrieved, set up table props
  const columns = [
    {
      field: 'local_metadata.host',
      name: i18n.translate('xpack.fleet.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'id',
      name: i18n.translate('xpack.fleet.agentList.metaColumnTitle', {
        defaultMessage: 'Meta',
      }),
      truncateText: true,
      sortable: true,
      render: () => <span>some-region</span>,
    },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.fleet.agentList.policyColumnTitle', {
        defaultMessage: 'Policy',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'event_rate',
      name: i18n.translate('xpack.fleet.agentList.eventsColumnTitle', {
        defaultMessage: 'Events (24h)',
      }),
      truncateText: true,
      sortable: true,
      render: () => <span>34</span>,
    },
    {
      field: 'status',
      name: i18n.translate('xpack.fleet.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      truncateText: true,
      sortable: true,
      render: () => <span>some status</span>,
    },
  ];

  const sorting = {
    sort: {
      field: 'last_checkin',
      direction: 'asc',
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const search = {
    box: {
      incremental: true,
      schema: true,
    },
    toolsRight: (
      <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
        <EuiFlexItem>
          <EuiButton color="secondary" iconType="refresh" onClick={fetchAgents}>
            <FormattedMessage id="xpack.fleet.agentList.reloadButton" defaultMessage="Reload" />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton fill iconType="plusInCircle">
            <FormattedMessage
              id="xpack.fleet.agentList.addButton"
              defaultMessage="Install new agent"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };

  const emptyPrompt = (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.fleet.agentList.noAgentsPrompt"
            defaultMessage="No agents installed"
          />
        </h2>
      }
      actions={
        <EuiButton fill iconType="plusInCircle">
          <FormattedMessage
            id="xpack.fleet.agentList.addButton"
            defaultMessage="Install new agent"
          />
        </EuiButton>
      }
    />
  );

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.fleet.agentList.pageTitle"
              defaultMessage="Elastic Fleet - Agents"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.fleet.agentList.pageDescription"
              defaultMessage="Use agents to faciliate data collection for your Elastic stack."
            />
          </EuiText>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          loading={isLoading}
          message={
            isLoading
              ? i18n.translate('xpack.fleet.agentList.loadingAgentsMessage', {
                  defaultMessage: 'Loading agents…',
                })
              : agents.length === 0
              ? emptyPrompt
              : null
          }
          items={agents}
          itemId="id"
          columns={columns}
          search={search}
          sorting={sorting}
          pagination={pagination}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
