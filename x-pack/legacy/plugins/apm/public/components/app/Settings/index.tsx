/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
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
  EuiButton,
  EuiLink
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useFetcher } from '../../../hooks/useFetcher';
import { AgentConfigurationListAPIResponse } from '../../../../server/lib/settings/agent_configuration/list_configurations';
import { AddSettingsFlyout } from './AddSettings/AddSettingFlyout';
import { callApmApi } from '../../../services/rest/callApmApi';
import { HomeLink } from '../../shared/Links/apm/HomeLink';
import { SettingsList } from './SettingsList';
import { useTrackPageview } from '../../../../../infra/public';

export type Config = AgentConfigurationListAPIResponse[0];

export function Settings() {
  const { data = [], status, refresh } = useFetcher(
    () =>
      callApmApi({
        pathname: `/api/apm/settings/agent-configuration`
      }),
    []
  );
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  useTrackPageview({ app: 'apm', path: 'agent_configuration' });
  useTrackPageview({ app: 'apm', path: 'agent_configuration', delay: 15000 });

  const RETURN_TO_OVERVIEW_LINK_LABEL = i18n.translate(
    'xpack.apm.settings.agentConf.returnToOverviewLinkLabel',
    {
      defaultMessage: 'Return to overview'
    }
  );

  const hasConfigurations = !isEmpty(data);

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
              {i18n.translate('xpack.apm.settings.agentConf.pageTitle', {
                defaultMessage: 'Settings'
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HomeLink>
            <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
              {RETURN_TO_OVERVIEW_LINK_LABEL}
            </EuiButtonEmpty>
          </HomeLink>
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

        <SettingsList
          status={status}
          data={data}
          setIsFlyoutOpen={setIsFlyoutOpen}
          setSelectedConfig={setSelectedConfig}
        />
      </EuiPanel>
    </>
  );
}
