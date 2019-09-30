/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
import { isEmpty } from 'lodash';
import { loadAgentConfigurationList } from '../../../services/rest/apm/settings';
import { useFetcher } from '../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
import { AgentConfigurationListAPIResponse } from '../../../../server/lib/settings/agent_configuration/list_configurations';
import { AddSettingsFlyout } from './AddSettings/AddSettingFlyout';
import { APMLink } from '../../shared/Links/APMLink';
import { LoadingStatePrompt } from '../../shared/LoadingStatePrompt';

export type Config = AgentConfigurationListAPIResponse[0];

export function SettingsList() {
  const { data = [], status, refresh } = useFetcher(
    loadAgentConfigurationList,
    []
  );
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const COLUMNS: Array<ITableColumn<Config>> = [
    {
      field: 'service.name',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.serviceNameColumnLabel',
        {
          defaultMessage: 'Service name'
        }
      ),
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
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.environmentColumnLabel',
        {
          defaultMessage: 'Service environment'
        }
      ),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'settings.transaction_sample_rate',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.sampleRateColumnLabel',
        {
          defaultMessage: 'Sample rate'
        }
      ),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: '@timestamp',
      name: i18n.translate(
        'xpack.apm.settings.agentConf.configTable.lastUpdatedColumnLabel',
        {
          defaultMessage: 'Last updated'
        }
      ),
      sortable: true,
      render: (value: number) => (value ? moment(value).fromNow() : null)
    },
    {
      name: '',
      actions: [
        {
          name: i18n.translate(
            'xpack.apm.settings.agentConf.configTable.editButtonLabel',
            {
              defaultMessage: 'Edit'
            }
          ),
          description: i18n.translate(
            'xpack.apm.settings.agentConf.configTable.editButtonDescription',
            {
              defaultMessage: 'Edit this config'
            }
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

  const RETURN_TO_OVERVIEW_LINK_LABEL = i18n.translate(
    'xpack.apm.settings.agentConf.returnToOverviewLinkLabel',
    {
      defaultMessage: 'Return to overview'
    }
  );

  const hasConfigurations = !isEmpty(data);

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
            'xpack.apm.settings.agentConf.createConfigButtonLabel',
            {
              defaultMessage: 'Create configuration'
            }
          )}
        </EuiButton>
      }
    />
  );

  return (
    <>
      {isFlyoutOpen ? (
        <AddSettingsFlyout
          key={selectedConfig ? selectedConfig.id : undefined}
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
      ) : null}

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.apm.settings.agentConf.pageTitle', {
                defaultMessage: 'Settings'
              })}
            </h1>
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
              <h2>
                {i18n.translate(
                  'xpack.apm.settings.agentConf.configurationsPanelTitle',
                  {
                    defaultMessage: 'Configurations'
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.apm.settings.agentConf.betaBadgeLabel',
                {
                  defaultMessage: 'Beta'
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.apm.settings.agentConf.betaBadgeText',
                {
                  defaultMessage:
                    'This feature is still in development. If you have feedback, please reach out in our Discuss forum.'
                }
              )}
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
                    {i18n.translate(
                      'xpack.apm.settings.agentConf.createConfigButtonLabel',
                      {
                        defaultMessage: 'Create configuration'
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiCallOut
          title={i18n.translate(
            'xpack.apm.settings.agentConf.betaCallOutTitle',
            {
              defaultMessage: 'APM Agent Configuration (BETA)'
            }
          )}
          iconType="iInCircle"
        >
          <p>
            <FormattedMessage
              id="xpack.apm.settings.agentConf.betaCallOutText"
              defaultMessage="We're excited to bring you a first look at APM Agent configuration. {agentConfigDocsLink}"
              values={{
                agentConfigDocsLink: (
                  <EuiLink href="https://www.elastic.co/guide/en/kibana/current/agent-configuration.html">
                    {i18n.translate(
                      'xpack.apm.settings.agentConf.agentConfigDocsLinkLabel',
                      { defaultMessage: 'Learn more in our docs.' }
                    )}
                  </EuiLink>
                )
              }}
            />
          </p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        {status === 'success' && !hasConfigurations ? (
          emptyStatePrompt
        ) : (
          <ManagedTable
            noItemsMessage={<LoadingStatePrompt />}
            columns={COLUMNS}
            items={data}
            initialSort={{ field: 'service.name', direction: 'asc' }}
            initialPageSize={50}
          />
        )}
      </EuiPanel>
    </>
  );
}
