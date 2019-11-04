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
  EuiHealth,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Policy, Status as PolicyStatus } from '../../../scripts/mock_spec/types';
import {
  DEFAULT_AGENTS_PAGE_SIZE,
  AGENTS_PAGE_SIZE_OPTIONS,
} from '../../../common/constants/agent';
import { useLibs } from '../../hooks/use_libs';
import { ConnectedLink } from '../../components/navigation/connected_link';

export const PolicyListPage: React.SFC<{}> = () => {
  const libs = useLibs();
  // Agent data states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [policies, setPolicies] = useState<Policy[]>([]);

  // Fetch agents method
  const fetchPolicies = async () => {
    setIsLoading(true);
    setPolicies(await libs.policies.getAll());
    setIsLoading(false);
  };

  // Load initial list of policies
  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Some agents retrieved, set up table props
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.fleet.policyList.nameColumnTitle', {
        defaultMessage: 'Name/ID',
      }),
      render: (name: string, policy: Policy) => name || policy.id,
    },
    {
      field: 'status',
      name: i18n.translate('xpack.fleet.policyList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      render: (status: PolicyStatus) =>
        status === PolicyStatus.Active ? (
          <EuiHealth color="success">
            <FormattedMessage
              id="xpack.fleet.policyList.activeStatusText"
              defaultMessage="Active"
            />
          </EuiHealth>
        ) : (
          <EuiHealth color="subdued">
            <FormattedMessage
              id="xpack.fleet.policyList.inactiveStatusText"
              defaultMessage="Inactive"
            />
          </EuiHealth>
        ),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.fleet.policyList.agentsCountColumnTitle', {
        defaultMessage: 'Agents enrolled',
      }),
      render: () => (
        // TODO: Make this link to filtered agents list and change to real agent count
        <ConnectedLink color="primary" path={`/agents`}>
          {'3'}
        </ConnectedLink>
      ),
    },
    {
      field: 'datasources',
      name: i18n.translate('xpack.fleet.policyList.datasourcesCountColumnTitle', {
        defaultMessage: 'Datasources assigned',
      }),
      render: (datasources: Policy['datasources']) => (datasources ? datasources.length : '0'),
    },
    {
      name: i18n.translate('xpack.fleet.policyList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: (policy: Policy) => {
            return (
              <ConnectedLink color="primary" path={`/policies/${policy.id}`}>
                <FormattedMessage
                  id="xpack.fleet.policyList.viewActionLinkText"
                  defaultMessage="view"
                />
              </ConnectedLink>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  const emptyPrompt = (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.fleet.policyList.noPoliciesPrompt"
            defaultMessage="No policies set up"
          />
        </h2>
      }
      actions={
        libs.framework.capabilities.write ? (
          <EuiButton fill iconType="plusInCircle">
            <FormattedMessage
              id="xpack.fleet.policyList.addButton"
              defaultMessage="Create new policy"
            />
          </EuiButton>
        ) : null
      }
    />
  );

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc',
    },
  };

  const pagination = {
    initialPageSize: DEFAULT_AGENTS_PAGE_SIZE,
    pageSizeOptions: AGENTS_PAGE_SIZE_OPTIONS,
  };

  const search = {
    toolsRight: [
      <EuiButton
        key="reloadPolicies"
        color="secondary"
        iconType="refresh"
        onClick={fetchPolicies}
        data-test-subj="reloadButton"
      >
        <FormattedMessage
          id="xpack.fleet.policyList.reloadPoliciesButtonText"
          defaultMessage="Reload"
        />
      </EuiButton>,
      <EuiButton fill iconType="plusInCircle">
        <FormattedMessage
          id="xpack.fleet.policyList.addButton"
          defaultMessage="Create new policy"
        />
      </EuiButton>,
    ],
    box: {
      incremental: true,
      schema: true,
    },
  };

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage id="xpack.fleet.policyList.pageTitle" defaultMessage="Policies" />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.fleet.policyList.pageDescription"
                  defaultMessage="Use policies to manage your agents and the data they collect."
                />
              </EuiText>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          loading={isLoading}
          message={
            isLoading && (!policies || policies.length === 0) ? (
              <FormattedMessage
                id="xpack.fleet.policyList.loadingPoliciesMessage"
                defaultMessage="Loading policies…"
              />
            ) : (
              emptyPrompt
            )
          }
          itemId="id"
          items={policies}
          columns={columns}
          sorting={sorting}
          pagination={pagination}
          search={search}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
