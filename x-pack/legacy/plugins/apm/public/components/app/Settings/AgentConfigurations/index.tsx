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
  EuiPanel,
  EuiSpacer,
  EuiButton
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useFetcher } from '../../../../hooks/useFetcher';
import { AgentConfigurationListAPIResponse } from '../../../../../server/lib/settings/agent_configuration/list_configurations';
import { AgentConfigurationList } from './AgentConfigurationList';
import { useTrackPageview } from '../../../../../../infra/public';
import { AddEditFlyout } from './AddEditFlyout';

export type Config = AgentConfigurationListAPIResponse[0];

export function AgentConfigurations() {
  const { data = [], status, refetch } = useFetcher(
    callApmApi =>
      callApmApi({ pathname: `/api/apm/settings/agent-configuration` }),
    [],
    { preservePreviousData: false }
  );
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  useTrackPageview({ app: 'apm', path: 'agent_configuration' });
  useTrackPageview({ app: 'apm', path: 'agent_configuration', delay: 15000 });

  const hasConfigurations = !isEmpty(data);

  const onClose = () => {
    setSelectedConfig(null);
    setIsFlyoutOpen(false);
  };

  return (
    <>
      {isFlyoutOpen && (
        <AddEditFlyout
          selectedConfig={selectedConfig}
          onClose={onClose}
          onSaved={() => {
            onClose();
            refetch();
          }}
          onDeleted={() => {
            onClose();
            refetch();
          }}
        />
      )}

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

          {hasConfigurations ? (
            <CreateConfigurationButton onClick={() => setIsFlyoutOpen(true)} />
          ) : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <AgentConfigurationList
          status={status}
          data={data}
          setIsFlyoutOpen={setIsFlyoutOpen}
          setSelectedConfig={setSelectedConfig}
        />
      </EuiPanel>
    </>
  );
}

function CreateConfigurationButton({ onClick }: { onClick: () => void }) {
  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            iconType="plusInCircle"
            onClick={onClick}
          >
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
