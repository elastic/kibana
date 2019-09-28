/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../../shared/ManagedTable';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { AgentConfigurationListAPIResponse } from '../../../../../server/lib/settings/agent_configuration/list_configurations';
import { Config } from '.';
const t = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.apm.settings.agentConf.configTable.${id}`, {
    defaultMessage
  });

export function AgentConfigurationList({
  status,
  data,
  setIsFlyoutOpen,
  setSelectedConfig
}: {
  status: FETCH_STATUS;
  data: AgentConfigurationListAPIResponse;
  setIsFlyoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedConfig: React.Dispatch<React.SetStateAction<Config | null>>;
}) {
  const columns: Array<ITableColumn<Config>> = [
    {
      field: 'service.name',
      name: t('serviceNameColumnLabel', 'Service name'),
      sortable: true,
      render: (_, config: Config) => (
        <EuiButtonEmpty
          size="s"
          color="primary"
          onClick={() => {
            setSelectedConfig(config);
            setIsFlyoutOpen(true);
          }}
        >
          {config.service.name}
        </EuiButtonEmpty>
      )
    },
    {
      field: 'service.environment',
      name: t('environmentColumnLabel', 'Service environment'),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'settings.transaction_sample_rate',
      name: t('sampleRateColumnLabel', 'Sample rate'),
      dataType: 'number',
      sortable: true,
      render: (value: number) => value
    },
    {
      field: 'settings.capture_body',
      name: t('captureBodyColumnLabel', 'Capture body'),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'settings.transaction_max_spans',
      name: t('transactionMaxSpansColumnLabel', 'Transaction max spans'),
      dataType: 'number',
      sortable: true,
      render: (value: number) => value
    },
    {
      field: '@timestamp',
      name: t('lastUpdatedColumnLabel', 'Last updated'),
      sortable: true,
      render: (value: number) => (value ? moment(value).fromNow() : null)
    },
    {
      name: '',
      actions: [
        {
          name: t('editButtonLabel', 'Edit'),
          description: t('editButtonDescription', 'Edit this config'),
          icon: 'pencil',
          color: 'primary',
          type: 'icon',
          onClick: (config: Config) => {
            setSelectedConfig(config);
            setIsFlyoutOpen(true);
          }
        }
      ]
    }
  ];

  const emptyStatePrompt = (
    <EuiEmptyPrompt
      iconType="controlsHorizontal"
      title={<h2>{t('emptyPromptTitle', 'No configurations found.')}</h2>}
      body={
        <>
          <p>
            {t(
              'emptyPromptText',
              "Let's change that! You can fine-tune agent configuration directly from Kibana without having to redeploy. Get started by creating your first configuration."
            )}
          </p>
        </>
      }
      actions={
        <EuiButton color="primary" fill onClick={() => setIsFlyoutOpen(true)}>
          {t('createConfigButtonLabel', 'Create configuration')}
        </EuiButton>
      }
    />
  );

  const failurePrompt = (
    <EuiEmptyPrompt
      iconType="alert"
      body={
        <>
          <p>
            {t(
              'configTable.failurePromptText',
              'The list of agent configurations could not be fetched. Your user may not have the sufficient permissions.'
            )}
          </p>
        </>
      }
    />
  );

  if (status === 'failure') {
    return failurePrompt;
  }

  if (status === 'success' && isEmpty(data)) {
    return emptyStatePrompt;
  }

  return (
    <ManagedTable
      noItemsMessage={<LoadingStatePrompt />}
      columns={columns}
      items={data}
      initialSortField="service.name"
      initialSortDirection="asc"
      initialPageSize={50}
    />
  );
}
