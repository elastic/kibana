/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiButtonEmpty,
  EuiHealth,
  EuiToolTip
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../../shared/ManagedTable';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { AgentConfigurationListAPIResponse } from '../../../../../server/lib/settings/agent_configuration/list_configurations';
import { Config } from '.';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { px, units } from '../../../../style/variables';
import { getOptionLabel } from '../../../../../common/agent_configuration_constants';

export function AgentConfigurationList({
  status,
  data,
  setIsFlyoutOpen,
  setSelectedConfig
}: {
  status: FETCH_STATUS;
  data: AgentConfigurationListAPIResponse;
  setIsFlyoutOpen: (val: boolean) => void;
  setSelectedConfig: (val: Config | null) => void;
}) {
  const columns: Array<ITableColumn<Config>> = [
    {
      field: 'applied_by_agent',
      align: 'center',
      width: px(units.double),
      name: '',
      sortable: true,
      render: (isApplied: boolean) => (
        <EuiToolTip
          content={
            isApplied
              ? i18n.translate(
                  'xpack.apm.settings.agentConf.configTable.appliedTooltipMessage',
                  { defaultMessage: 'Applied by at least one agent' }
                )
              : i18n.translate(
                  'xpack.apm.settings.agentConf.configTable.notAppliedTooltipMessage',
                  { defaultMessage: 'Not yet applied by any agents' }
                )
          }
        >
          <EuiHealth color={isApplied ? 'success' : theme.euiColorLightShade} />
        </EuiToolTip>
      )
    },
    {
      field: 'service.name',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.serviceNameColumnLabel',
        { defaultMessage: 'Service name' }
      ),
      sortable: true,
      render: (_, config: Config) => (
        <EuiButtonEmpty
          flush="left"
          size="s"
          color="primary"
          onClick={() => {
            setSelectedConfig(config);
            setIsFlyoutOpen(true);
          }}
        >
          {getOptionLabel(config.service.name)}
        </EuiButtonEmpty>
      )
    },
    {
      field: 'service.environment',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.environmentColumnLabel',
        { defaultMessage: 'Service environment' }
      ),
      sortable: true,
      render: (value: string) => getOptionLabel(value)
    },
    {
      field: 'settings.transaction_sample_rate',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.sampleRateColumnLabel',
        { defaultMessage: 'Sample rate' }
      ),
      dataType: 'number',
      sortable: true,
      render: (value: number) => value
    },
    {
      field: 'settings.capture_body',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.captureBodyColumnLabel',
        { defaultMessage: 'Capture body' }
      ),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'settings.transaction_max_spans',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.transactionMaxSpansColumnLabel',
        { defaultMessage: 'Transaction max spans' }
      ),
      dataType: 'number',
      sortable: true,
      render: (value: number) => value
    },
    {
      align: 'right',
      field: '@timestamp',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.lastUpdatedColumnLabel',
        { defaultMessage: 'Last updated' }
      ),
      sortable: true,
      render: (value: number) => (
        <TimestampTooltip time={value} timeUnit="minutes" />
      )
    },
    {
      width: px(units.double),
      name: '',
      actions: [
        {
          name: i18n.translate(
            'xpack.apm.settings.agentConf.configTable.editButtonLabel',
            { defaultMessage: 'Edit' }
          ),
          description: i18n.translate(
            'xpack.apm.settings.agentConf.configTable.editButtonDescription',
            { defaultMessage: 'Edit this config' }
          ),
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
      title={
        <h2>
          {i18n.translate(
            'xpack.apm.settings.agentConf.configTable.emptyPromptTitle',
            { defaultMessage: 'No configurations found.' }
          )}
        </h2>
      }
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.apm.settings.agentConf.configTable.emptyPromptText',
              {
                defaultMessage:
                  "Let's change that! You can fine-tune agent configuration directly from Kibana without having to redeploy. Get started by creating your first configuration."
              }
            )}
          </p>
        </>
      }
      actions={
        <EuiButton color="primary" fill onClick={() => setIsFlyoutOpen(true)}>
          {i18n.translate(
            'xpack.apm.settings.agentConf.configTable.createConfigButtonLabel',
            { defaultMessage: 'Create configuration' }
          )}
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
            {i18n.translate(
              'xpack.apm.settings.agentConf.configTable.configTable.failurePromptText',
              {
                defaultMessage:
                  'The list of agent configurations could not be fetched. Your user may not have the sufficient permissions.'
              }
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
