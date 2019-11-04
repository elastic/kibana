/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { SFC } from 'react';
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
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import {
  DEFAULT_AGENTS_PAGE_SIZE,
  AGENTS_PAGE_SIZE_OPTIONS,
} from '../../../common/constants/agent';
import { Datasource } from '../../../scripts/mock_spec/types';
import { Loading } from '../../components/loading';
import { useGetPolicy, PolicyRefreshContext } from './hooks/use_policy';

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
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.fleet.policyDetails.datasourcesTableTitle"
              defaultMessage="Datasources"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          message={
            !policy.datasources || policy.datasources.length === 0 ? (
              <EuiEmptyPrompt
                title={
                  <h2>
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.noDatasourcesPrompt"
                      defaultMessage="Policy has no datasources"
                    />
                  </h2>
                }
                actions={
                  <EuiButton fill iconType="plusInCircle">
                    <FormattedMessage
                      id="xpack.fleet.policyDetails.addDatasourceButtonText"
                      defaultMessage="Add a datasource"
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
        />
      </Layout>
    </PolicyRefreshContext.Provider>
  );
};
