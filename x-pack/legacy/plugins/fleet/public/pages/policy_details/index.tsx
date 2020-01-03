/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiHealth,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { Loading, ConnectedLink } from '../../components';
import { useLibs, sendRequest } from '../../hooks';
import {
  useGetPolicy,
  PolicyRefreshContext,
  useGetAgentStatus,
  AgentStatusRefreshContext,
} from './hooks';
import {
  DatasourcesTable,
  DonutChart,
  EditPolicyFlyout,
  AssignDatasourcesFlyout,
} from './components';

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
  const { framework, httpClient } = useLibs();
  const { policy, isLoading, error, refreshPolicy } = useGetPolicy(policyId);
  const {
    result: agentStatus,
    isLoading: agentStatusIsLoading,
    error: agentStatusError,
    refreshAgentStatus,
  } = useGetAgentStatus(policyId);

  // Unassign data sources states
  const [isUnassignLoading, setIsUnassignLoading] = useState<boolean>(false);
  const [selectedDatasources, setSelectedDatasources] = useState<string[]>([]);

  // Flyout states
  const [isEditPolicyFlyoutOpen, setIsEditPolicyFlyoutOpen] = useState<boolean>(false);
  const [isDatasourcesFlyoutOpen, setIsDatasourcesFlyoutOpen] = useState<boolean>(false);

  const refreshData = () => {
    refreshPolicy();
    refreshAgentStatus();
  };

  const unassignSelectedDatasources = async () => {
    setIsUnassignLoading(true);
    const { error: unassignError } = await sendRequest(httpClient, {
      path: `/api/ingest/policies/${policyId}/removeDatasources`,
      method: 'post',
      body: {
        datasources: selectedDatasources,
      },
    });
    setIsUnassignLoading(false);
    if (unassignError) {
      framework.notifications.addDanger(
        i18n.translate('xpack.fleet.policyDetails.unassignDatasources.errorNotificationTitle', {
          defaultMessage:
            'Error unassigning {count, plural, one {data source} other {# data sources}}',
          values: {
            count: selectedDatasources.length,
          },
        })
      );
    } else {
      framework.notifications.addSuccess(
        i18n.translate('xpack.fleet.policyDetails.unassignDatasources.successNotificationTitle', {
          defaultMessage:
            'Successfully unassigned {count, plural, one {data source} other {# data sources}}',
          values: {
            count: selectedDatasources.length,
          },
        })
      );
      setSelectedDatasources([]);
      refreshData();
    }
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
          {isDatasourcesFlyoutOpen ? (
            <AssignDatasourcesFlyout
              policyId={policy.id}
              existingDatasources={(policy.datasources || []).map(ds => ds.id)}
              onClose={() => {
                setIsDatasourcesFlyoutOpen(false);
                refreshData();
              }}
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
          <DatasourcesTable
            datasources={policy.datasources}
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
                      onClick={() => setIsDatasourcesFlyoutOpen(true)}
                    >
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.assignDatasourcesButtonText"
                        defaultMessage="Assign data sources"
                      />
                    </EuiButton>
                  }
                />
              ) : null
            }
            search={{
              toolsRight: [
                <EuiButton
                  fill
                  iconType="plusInCircle"
                  onClick={() => setIsDatasourcesFlyoutOpen(true)}
                >
                  <FormattedMessage
                    id="xpack.fleet.policyDetails.assignDatasourcesButtonText"
                    defaultMessage="Assign data sources"
                  />
                </EuiButton>,
              ],
              toolsLeft: selectedDatasources.length
                ? [
                    <EuiButton
                      color="danger"
                      disabled={isUnassignLoading}
                      isLoading={isUnassignLoading}
                      onClick={unassignSelectedDatasources}
                    >
                      <FormattedMessage
                        id="xpack.fleet.policyDetails.unassignDatasourcesButtonLabel"
                        defaultMessage="Unassign {count, plural, one {# data source} other {# data sources}}"
                        values={{
                          count: selectedDatasources.length,
                        }}
                      />
                    </EuiButton>,
                  ]
                : null,
              box: {
                incremental: true,
                schema: true,
              },
            }}
            selection={{
              onSelectionChange: (selection: Array<{ id: string }>) =>
                setSelectedDatasources(selection.map(ds => ds.id)),
            }}
            isSelectable={true}
          />
        </Layout>
      </AgentStatusRefreshContext.Provider>
    </PolicyRefreshContext.Provider>
  );
};
