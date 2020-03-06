/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiButton
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useFetcher } from '../../../../hooks/useFetcher';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AgentConfigurationListAPIResponse } from '../../../../../../../../plugins/apm/server/lib/settings/agent_configuration/list_configurations';
import { AgentConfigurationList } from './AgentConfigurationList';
import { useTrackPageview } from '../../../../../../../../plugins/observability/public';
import { getAPMHref } from '../../../shared/Links/apm/APMLink';
import { useLocation } from '../../../../hooks/useLocation';

export type Config = AgentConfigurationListAPIResponse[0];

export function AgentConfigurations() {
  const { data = [], status } = useFetcher(
    callApmApi =>
      callApmApi({ pathname: '/api/apm/settings/agent-configuration' }),
    [],
    { preservePreviousData: false }
  );

  useTrackPageview({ app: 'apm', path: 'agent_configuration' });
  useTrackPageview({ app: 'apm', path: 'agent_configuration', delay: 15000 });

  const hasConfigurations = !isEmpty(data);

  return (
    <>
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                {i18n.translate(
                  'xpack.apm.settings.agentConf.configurationsPanelTitle',
                  { defaultMessage: 'Agent remote configuration' }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          {hasConfigurations ? <CreateConfigurationButton /> : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <AgentConfigurationList status={status} data={data} />
      </EuiPanel>
    </>
  );
}

function CreateConfigurationButton() {
  const { search } = useLocation();
  const href = getAPMHref('/settings/agent-configuration/create', search);
  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" fill iconType="plusInCircle" href={href}>
            {i18n.translate(
              'xpack.apm.settings.agentConf.createConfigButtonLabel',
              { defaultMessage: 'Create configuration' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
