/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiEmptyPrompt,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Datasource } from '../../../../common/types/domain_data';
import { useRequest, sendRequest, useLibs } from '../../../hooks';
import { DatasourcesTable } from '.';

interface Props {
  policyId: string;
  existingDatasources: string[];
  onClose: () => void;
}

export const AssignDatasourcesFlyout: React.FC<Props> = ({
  policyId,
  existingDatasources,
  onClose,
}) => {
  const { framework, httpClient } = useLibs();
  const [selectedDatasources, setSelectedDatasources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch data sources
  const {
    isLoading: isDatasourcesLoading,
    data: datasourcesData,
    error: datasourcesError,
    sendRequest: refreshDatasources,
  } = useRequest({
    path: '/api/ingest/datasources',
    method: 'get',
    query: {
      page: 1,
      perPage: 10000,
    },
  });

  // Filter out data sources already assigned to policy
  const datasources: Datasource[] =
    datasourcesData?.list?.filter((ds: Datasource) => {
      return !existingDatasources.includes(ds.id);
    }) || [];

  const assignSelectedDatasources = async () => {
    setIsLoading(true);
    const { error } = await sendRequest(httpClient, {
      path: `/api/ingest/policies/${policyId}/addDatasources`,
      method: 'post',
      body: {
        datasources: selectedDatasources,
      },
    });
    setIsLoading(false);
    if (error) {
      framework.notifications.addDanger(
        i18n.translate('xpack.fleet.assignDatasources.errorNotificationTitle', {
          defaultMessage:
            'Error assigning {count, plural, one {data source} other {# data sources}}',
          values: {
            count: selectedDatasources.length,
          },
        })
      );
    } else {
      framework.notifications.addSuccess(
        i18n.translate('xpack.fleet.assignDatasources.successNotificationTitle', {
          defaultMessage:
            'Successfully assigned {count, plural, one {data source} other {# data sources}}',
          values: {
            count: selectedDatasources.length,
          },
        })
      );
      onClose();
    }
  };

  const InstallDatasourcesButton = (
    <EuiButton
      fill
      iconType="package"
      href={`${window.location.origin}${framework.info.basePath}/app/epm`}
    >
      <FormattedMessage
        id="xpack.fleet.assignDatasources.installDatasourcesButtonText"
        defaultMessage="Install new data sources"
      />
    </EuiButton>
  );

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetAssignDatasourcesFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetAssignDatasourcesFlyoutTitle">
          <FormattedMessage
            id="xpack.fleet.assignDatasources.flyoutTitle"
            defaultMessage="Assign data sources"
          />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const getTableMessage = () => {
    if (datasourcesError) {
      return (
        <FormattedMessage
          id="xpack.fleet.assignDatasources.errorLoadingDatasourcesMessage"
          defaultMessage="Unable to load data sources. {tryAgainLink}"
          values={{
            tryAgainLink: (
              <EuiLink onClick={() => refreshDatasources()}>
                <FormattedMessage
                  id="xpack.fleet.assignDatasources.retryLoadingDatasourcesLinkText"
                  defaultMessage="Try again"
                />
              </EuiLink>
            ),
          }}
        />
      );
    }

    if (datasourcesData && !datasourcesData.list.length) {
      return (
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.fleet.assignDatasources.noDatasourcesPrompt"
                defaultMessage="You have no data sources"
              />
            </h2>
          }
          actions={InstallDatasourcesButton}
        />
      );
    }

    if (!datasources.length && existingDatasources.length) {
      return (
        <EuiEmptyPrompt
          body={
            <FormattedMessage
              id="xpack.fleet.assignDatasources.allDatasourcesAssignedPrompt"
              defaultMessage="You have assigned all available data sources to this policy"
            />
          }
          actions={InstallDatasourcesButton}
        />
      );
    }

    return null;
  };

  const body = (
    <EuiFlyoutBody>
      <DatasourcesTable
        datasources={datasources}
        withPoliciesCount={true}
        loading={isDatasourcesLoading}
        message={getTableMessage()}
        search={{
          toolsRight: [InstallDatasourcesButton],
          box: {
            incremental: true,
            schema: true,
          },
          filters: [
            {
              type: 'field_value_toggle',
              field: 'policies',
              value: 0,
              name: (
                <FormattedMessage
                  id="xpack.fleet.assignDatasources.unassignedFilterButtonLabel"
                  defaultMessage="Unassigned"
                />
              ),
            },
          ],
        }}
        selection={{
          onSelectionChange: (selection: Datasource[]) =>
            setSelectedDatasources(selection.map(ds => ds.id)),
        }}
        isSelectable={true}
      />
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.fleet.assignDatasources.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            disabled={isLoading || !selectedDatasources.length}
            isLoading={isLoading}
            onClick={assignSelectedDatasources}
          >
            <FormattedMessage
              id="xpack.fleet.assignDatasources.submitButtonLabel"
              defaultMessage="Assign {count, plural, =0 {data sources} one {# data source} other {# data sources}}"
              values={{
                count: selectedDatasources.length,
              }}
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="m">
      {header}
      {body}
      {footer}
    </EuiFlyout>
  );
};
