/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { SFC, Fragment } from 'react';
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
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import {
  DEFAULT_AGENTS_PAGE_SIZE,
  AGENTS_PAGE_SIZE_OPTIONS,
} from '../../../common/constants/agent';
import { Datasource } from '../../../scripts/mock_spec/types';
import { Loading } from '../../components/loading';
import { useGetPolicy, PolicyRefreshContext } from './hooks/use_policy';
import { DonutChart } from './components/donut_chart';
import { ConnectedLink } from '../../components/navigation/connected_link';

export const Layout: SFC = ({ children }) => (
  <EuiPageBody>
    <EuiPageContent>{children}</EuiPageContent>
  </EuiPageBody>
);

type Props = RouteComponentProps<{
  policyId: string;
}>;

export const PolicyDetailsPage: SFC<Props> = ({
  match: {
    params: { policyId },
  },
}) => {
  const { policy, isLoading, error, refreshPolicy } = useGetPolicy(policyId);

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
          defaultMessage="Policy '{id}' not found"
          values={{
            id: policyId,
          }}
        />
      </Layout>
    );
  }

  return (
    <PolicyRefreshContext.Provider value={{ refresh: refreshPolicy }}>
      <Layout>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.fleet.policyDetails.policyDetailsTitle"
                  defaultMessage="Policy detail"
                />
              </h1>
            </EuiTitle>
            {policy.description ? (
              <Fragment>
                <EuiSpacer size="s" />
                <EuiText color="subdued">{policy.description}</EuiText>
              </Fragment>
            ) : null}
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
                  <span>78</span>
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
                  <span>19k</span>
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
                <DonutChart height={150} width={150} data={{ running: 67, offline: 8, error: 3 }} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiHealth color="success">67 running</EuiHealth>
                <EuiSpacer size="s" />
                <EuiHealth color="subdued">8 offline</EuiHealth>
                <EuiSpacer size="s" />
                <EuiHealth color="danger">3 error</EuiHealth>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
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
                  <EuiButton fill iconType="plusInCircle">
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
              <EuiButton fill iconType="plusInCircle">
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
    </PolicyRefreshContext.Provider>
  );
};
