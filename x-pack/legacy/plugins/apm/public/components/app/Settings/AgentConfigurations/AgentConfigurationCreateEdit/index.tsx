/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { AgentConfigurationIntake } from '../../../../../../../../../plugins/apm/server/lib/settings/agent_configuration/configuration_types';
import { ServicePage } from './ServicePage/ServicePage';
import { SettingsPage } from './SettingsPage/SettingsPage';
import { NewConfig } from './NewConfig';

export function AgentConfigurationCreateEdit({
  existingConfig
}: {
  existingConfig?: AgentConfigurationIntake;
}) {
  const [page, setPage] = useState<
    'service-page' | 'settings-page' | 'review-page'
  >('service-page');
  const [newConfig, setNewConfig] = useState<NewConfig>({
    agent_name: existingConfig?.agent_name,
    service: existingConfig?.service || {},
    settings: existingConfig?.settings || {}
  });
  const isEditMode = Boolean(existingConfig);

  useEffect(() => {
    if (isEditMode) {
      setPage('settings-page');
    }
  }, [isEditMode]);

  return (
    <>
      <EuiTitle>
        <h2>
          {isEditMode
            ? i18n.translate('xpack.apm.settings.agentConf.editConfigTitle', {
                defaultMessage: 'Edit configuration'
              })
            : i18n.translate('xpack.apm.settings.agentConf.createConfigTitle', {
                defaultMessage: 'Create configuration'
              })}
        </h2>
      </EuiTitle>

      <EuiText size="s">
        This allows you to fine-tune your agent configuration directly in
        Kibana. Best of all, changes are automatically propagated to your APM
        agents so there’s no need to redeploy.
      </EuiText>

      <EuiSpacer size="m" />

      {page === 'service-page' && (
        <ServicePage
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          onClickNext={() => setPage('settings-page')}
        />
      )}

      {page === 'settings-page' && (
        <SettingsPage
          onClickEdit={() => setPage('service-page')}
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          isEditMode={isEditMode}
        />
      )}

      {page === 'review-page' && <div>Review will be here </div>}
    </>
  );
}
