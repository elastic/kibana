/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiButton,
  EuiTitle,
  EuiHealth,
  EuiButtonEmpty,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import {
  DEFAULT_AGENTS_PAGE_SIZE,
  AGENTS_PAGE_SIZE_OPTIONS,
} from '../../../common/constants/agent';
import { Datasource } from '../../../common/types/domain_data';
import { Loading } from '../../components/loading';
import { ConnectedLink } from '../../components/navigation/connected_link';
import { useLibs } from '../../hooks/use_libs';
import { useGetPolicy, PolicyRefreshContext } from './hooks/use_policy';
import { useGetAgentStatus, AgentStatusRefreshContext } from './hooks/use_agent_status';
import { DonutChart } from './components/donut_chart';
import { EditPolicyFlyout } from './components/edit_policy';

export const Layout: React.FC = ({ children }) => (
  <EuiPageBody>
    <EuiPageContent>{children}</EuiPageContent>
  </EuiPageBody>
);

type Props = RouteComponentProps<{
  policyId: string;
}>;

export const PolicyDetailsPage: React.FC<Props> = ({
  match: {
    params: { policyId },
  },
}) => {
  const { framework } = useLibs();
  const { policy, isLoading, error, refreshPolicy } = useGetPolicy(policyId);
  const {
    result: agentStatus,
    isLoading: agentStatusIsLoading,
    error: agentStatusError,
    refreshAgentStatus,
  } = useGetAgentStatus(policyId);

  // Edit policy flyout state
  const [isEditPolicyFlyoutOpen, setIsEditPolicyFlyoutOpen] = useState<boolean>(false);

  const refreshData = () => {
    refreshPolicy();
    refreshAgentStatus();
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Layout>
        <EuiCallOut
          title={i18n.translate('xpack.fleet.policyDetails.unexceptedErrorTitle', {
            defaultMessage: 'An error happened while loading the policy',
          })}
          color="danger"
          iconType="alert"
        >
          <p>
            <EuiText>{error.message}</EuiText>
          </p>
        </EuiCallOut>
      </Layout>
    );
  }

  if (!policy) {
    return (
      <Layout>
        <FormattedMessage
          id="xpack.fleet.policyDetails.policyNotFoundErrorTitle"
          defaultMessage="Policy ID '{id}' not found"
          values={{
            id: policyId,
          }}
        />
      </Layout>
    );
  }

  return (
    <PolicyRefreshContext.Provider value={{ refresh: refreshPolicy }}>
      <AgentStatusRefreshContext.Provider value={{ refresh: refreshAgentStatus }}>
        <Layout>
          {isEditPolicyFlyoutOpen ? (
            <EditPolicyFlyout
              onClose={() => {
                setIsEditPolicyFlyoutOpen(false);
                refreshData();
              }}
              policy={policy}
            />
          ) : null}
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>
                  {policy.name || (
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.policyDetailsTitle"
                      defaultMessage="Policy '{id}'"
                      values={{
                        id: policyId,
                      }}
                    />
                  )}
                </h1>
              </EuiTitle>
              {policy.description ? (
                <Fragment>
                  <EuiSpacer size="s" />
                  <EuiText color="subdued">{policy.description}</EuiText>
                </Fragment>
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => setIsEditPolicyFlyoutOpen(true)}>
                <FormattedMessage
                  id="xpack.fleet.policyDetails.editPolicyButtonLabel"
                  defaultMessage="Edit"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiTitle size="m">
            <h3>
              <FormattedMessage
                id="xpack.fleet.policyDetails.agentsSummaryTitle"
                defaultMessage="Enrolled agents"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="l" />
          {agentStatusIsLoading ? (
            <Loading />
          ) : agentStatusError ? (
            <FormattedMessage
              id="xpack.fleet.policyDetails.agentStatusNotFoundErrorTitle"
              defaultMessage="Unable to load enrolled agents status"
            />
          ) : (
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.agentsTotalTitle"
                      defaultMessage="Total"
                    />
                  </h5>
                </EuiTitle>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <span>{agentStatus.total}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {/* TODO: Make this link to filtered agents list and change to real agent count */}
                    <ConnectedLink color="primary" path={`/agents`}>
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.viewAgentsLinkText"
                        defaultMessage="View agents"
                      />
                    </ConnectedLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.eventsTitle"
                      defaultMessage="Events"
                    />
                  </h5>
                </EuiTitle>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <span>{agentStatus.events}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.agentsStatusTitle"
                      defaultMessage="Status"
                    />
                  </h5>
                </EuiTitle>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <DonutChart
                      height={150}
                      width={150}
                      data={
                        agentStatus.total === 0
                          ? {
                              online: 0,
                              offline: 1,
                              error: 0,
                            }
                          : {
                              online: agentStatus.online,
                              offline: agentStatus.offline,
                              error: agentStatus.error,
                            }
                      }
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="success">
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.onlineAgentsCountText"
                        defaultMessage="{count} online"
                        values={{
                          count: agentStatus.online,
                        }}
                      />
                    </EuiHealth>
                    <EuiSpacer size="s" />
                    <EuiHealth color="subdued">
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.offlineAgentsCountText"
                        defaultMessage="{count} offline"
                        values={{
                          count: agentStatus.offline,
                        }}
                      />
                    </EuiHealth>
                    <EuiSpacer size="s" />
                    <EuiHealth color="danger">
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.errorAgentsCountText"
                        defaultMessage="{count} error"
                        values={{
                          count: agentStatus.error,
                        }}
                      />
                    </EuiHealth>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <EuiSpacer size="xl" />
          <EuiTitle size="m">
            <h3>
              <FormattedMessage
                id="xpack.fleet.policyDetails.datasourcesTableTitle"
                defaultMessage="Assigned data sources"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiInMemoryTable
            message={
              !policy.datasources || policy.datasources.length === 0 ? (
                <EuiEmptyPrompt
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.noDatasourcesPrompt"
                        defaultMessage="Policy has no data sources"
                      />
                    </h2>
                  }
                  actions={
                    <EuiButton
                      fill
                      iconType="plusInCircle"
                      href={`${window.location.origin}${framework.info.basePath}/app/epm`}
                    >
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.addDatasourceButtonText"
                        defaultMessage="Add a data source"
                      />
                    </EuiButton>
                  }
                />
              ) : null
            }
            itemId="id"
            items={policy.datasources}
            columns={[
              {
                field: 'name',
                name: i18n.translate('xpack.fleet.policyList.datasourcesTable.ameColumnTitle', {
                  defaultMessage: 'Name/ID',
                }),
              },
              {
                field: 'package.title',
                name: i18n.translate(
                  'xpack.fleet.policyList.datasourcesTable.packageNameColumnTitle',
                  {
                    defaultMessage: 'Package',
                  }
                ),
              },
              {
                field: 'package.version',
                name: i18n.translate(
                  'xpack.fleet.policyList.datasourcesTable.packageVersionColumnTitle',
                  {
                    defaultMessage: 'Version',
                  }
                ),
              },
              {
                field: 'streams',
                name: i18n.translate(
                  'xpack.fleet.policyList.datasourcesTable.streamsCountColumnTitle',
                  {
                    defaultMessage: 'Streams',
                  }
                ),
                render: (streams: Datasource['streams']) => (streams ? streams.length : 0),
              },
            ]}
            sorting={{
              field: 'name',
              direction: 'asc',
            }}
            pagination={{
              initialPageSize: DEFAULT_AGENTS_PAGE_SIZE,
              pageSizeOptions: AGENTS_PAGE_SIZE_OPTIONS,
            }}
            search={{
              toolsRight: [
                <EuiButton
                  fill
                  iconType="plusInCircle"
                  href={`${window.location.origin}${framework.info.basePath}/app/epm`}
                >
                  <FormattedMessage
                    id="xpack.fleet.policyDetails.addDatasourceButtonText"
                    defaultMessage="Add a data source"
                  />
                </EuiButton>,
              ],
              box: {
                incremental: true,
                schema: true,
              },
            }}
          />
        </Layout>
      </AgentStatusRefreshContext.Provider>
    </PolicyRefreshContext.Provider>
  );
};
