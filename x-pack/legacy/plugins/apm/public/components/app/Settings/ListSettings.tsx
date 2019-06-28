/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiPanel,
  EuiBetaBadge,
  EuiSpacer,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiButton,
  EuiLink
} from '@elastic/eui';
import { loadCMList } from '../../../services/rest/apm/settings';
import { useFetcher } from '../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
import { CMListAPIResponse } from '../../../../server/lib/settings/cm/list_configurations';
import { AddSettingsFlyout } from './AddSettings/AddSettingFlyout';
import { APMLink } from '../../shared/Links/APMLink';

export type Config = CMListAPIResponse[0];

export function ListSettings() {
  const { data = [], refresh } = useFetcher(loadCMList, []);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const COLUMNS: Array<ITableColumn<Config>> = [
    {
      field: 'service.name',
      name: i18n.translate('xpack.apm.settingsTable.serviceNameColumnLabel', {
        defaultMessage: 'Service name'
      }),
      width: '50%',
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'service.environment',
      name: i18n.translate('xpack.apm.settingsTable.environmentColumnLabel', {
        defaultMessage: 'Service environment'
      }),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'settings.sample_rate',
      name: i18n.translate('xpack.apm.settingsTable.sampelRateColumnLabel', {
        defaultMessage: 'Sample rate'
      }),
      sortable: true,
      render: (value: string) => value
    },
    {
      name: '',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this config',
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

  const RETURN_TO_OVERVIEW_LINK_LABEL = i18n.translate(
    'xpack.apm.returnToOverviewLinkLabel',
    {
      defaultMessage: 'Return to overview'
    }
  );

  const hasConfigurations = data.length !== 0;

  return (
    <>
      <AddSettingsFlyout
        isOpen={isFlyoutOpen}
        selectedConfig={selectedConfig}
        onClose={() => {
          setSelectedConfig(null);
          setIsFlyoutOpen(false);
        }}
        onSubmit={() => {
          setSelectedConfig(null);
          setIsFlyoutOpen(false);
          refresh();
        }}
      />

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>Settings</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <APMLink path="/">
            <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
              {RETURN_TO_OVERVIEW_LINK_LABEL}
            </EuiButtonEmpty>
          </APMLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>Configurations</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label="Beta"
              tooltipContent="This feature is still in development. If you have feedback, please reach out in our Discuss forum."
            />
          </EuiFlexItem>
          {hasConfigurations ? (
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="primary"
                    fill
                    iconType="plusInCircle"
                    onClick={() => setIsFlyoutOpen(true)}
                  >
                    Create configuration
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiCallOut title="APM Agent Configuration (BETA)" iconType="iInCircle">
          <p>
            We're excited to bring you a first look at APM Agent
            configuration.&nbsp;
            <EuiLink href="https://www.elastic.co/guide/en/kibana/current/agent-configuration.html">
              Learn more in our docs
            </EuiLink>
            .
          </p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        {hasConfigurations ? (
          <ManagedTable columns={COLUMNS} items={data} initialPageSize={50} />
        ) : (
          <EuiEmptyPrompt
            iconType="controlsHorizontal"
            title={<h2>No configurations found.</h2>}
            body={
              <>
                <p>
                  Let's change that! You can fine-tune agent configuration
                  directly from Kibana without having to redeploy. Get started
                  by creating your first configuration.
                </p>
              </>
            }
            actions={
              <EuiButton
                color="primary"
                fill
                onClick={() => setIsFlyoutOpen(true)}
              >
                Create configuration
              </EuiButton>
            }
          />
        )}
      </EuiPanel>
    </>
  );
}
