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
import { loadCMList } from '../../../services/rest/apm/settings';
import { useFetcher } from '../../../hooks/useFetcher';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
import { CMListAPIResponse } from '../../../../server/lib/settings/cm/list_configurations';
import { AddSettingsFlyout } from './AddSettings/AddSettingFlyout';
import { APMLink } from '../../shared/Links/APMLink';

export type Config = CMListAPIResponse[0];

export function SettingsList() {
  const { data = [], refresh } = useFetcher(loadCMList, []);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const COLUMNS: Array<ITableColumn<Config>> = [
    {
      field: 'service.name',
      name: i18n.translate(
        'xpack.apm.settings.cm.configTable.serviceNameColumnLabel',
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
        'xpack.apm.settings.cm.configTable.environmentColumnLabel',
        {
          defaultMessage: 'Service environment'
        }
      ),
      sortable: true,
      render: (value: string) => value
    },
    {
      field: 'settings.sample_rate',
      name: i18n.translate(
        'xpack.apm.settings.cm.configTable.sampleRateColumnLabel',
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
        'xpack.apm.settings.cm.configTable.lastUpdatedColumnLabel',
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
            'xpack.apm.settings.cm.configTable.editButtonLabel',
            {
              defaultMessage: 'Edit'
            }
          ),
          description: i18n.translate(
            'xpack.apm.settings.cm.configTable.editButtonDescription',
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
    'xpack.apm.settings.cm.returnToOverviewLinkLabel',
    {
      defaultMessage: 'Return to overview'
    }
  );

  const hasConfigurations = !isEmpty(data);

  const emptyState = (
    <EuiEmptyPrompt
      iconType="controlsHorizontal"
      title={
        <h2>
          {i18n.translate(
            'xpack.apm.settings.cm.configTable.emptyPromptTitle',
            { defaultMessage: 'No configurations found.' }
          )}
        </h2>
      }
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.apm.settings.cm.configTable.emptyPromptText',
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
          {i18n.translate('xpack.apm.settings.cm.createConfigButtonLabel', {
            defaultMessage: 'Create configuration'
          })}
        </EuiButton>
      }
    />
  );

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
            <h1>
              {i18n.translate('xpack.apm.settings.cm.pageTitle', {
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
                  'xpack.apm.settings.cm.configurationsPanelTitle',
                  {
                    defaultMessage: 'Configurations'
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('xpack.apm.settings.cm.betaBadgeLabel', {
                defaultMessage: 'Beta'
              })}
              tooltipContent={i18n.translate(
                'xpack.apm.settings.cm.betaBadgeText',
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
                      'xpack.apm.settings.cm.createConfigButtonLabel',
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
          title={i18n.translate('xpack.apm.settings.cm.betaCallOutTitle', {
            defaultMessage: 'APM Agent Configuration (BETA)'
          })}
          iconType="iInCircle"
        >
          <p>
            <FormattedMessage
              id="xpack.apm.settings.cm.betaCallOutText"
              defaultMessage="We're excited to bring you a first look at APM Agent configuration. {agentConfigDocsLink}"
              values={{
                agentConfigDocsLink: (
                  <EuiLink href="https://www.elastic.co/guide/en/kibana/current/agent-configuration.html">
                    {i18n.translate(
                      'xpack.apm.settings.cm.agentConfigDocsLinkLabel',
                      { defaultMessage: 'Learn more in our docs.' }
                    )}
                  </EuiLink>
                )
              }}
            />
          </p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        {hasConfigurations ? (
          <ManagedTable
            columns={COLUMNS}
            items={data}
            initialSort={{ field: 'service.name', direction: 'asc' }}
            initialPageSize={50}
          />
        ) : (
          emptyState
        )}
      </EuiPanel>
    </>
  );
}
