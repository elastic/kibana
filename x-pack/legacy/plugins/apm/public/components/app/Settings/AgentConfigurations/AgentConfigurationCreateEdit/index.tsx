/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { history } from '../../../../../utils/history';
import { AgentConfigurationIntake } from '../../../../../../../../../plugins/apm/server/lib/settings/agent_configuration/configuration_types';
import { ServicePage } from './ServicePage/ServicePage';
import { SettingsPage } from './SettingsPage/SettingsPage';
import { NewConfig } from './NewConfig';
import { fromQuery, toQuery } from '../../../../shared/Links/url_helpers';

type PageStep = 'choose-service-step' | 'choose-settings-step' | 'review-step';

function setPage(pageStep: PageStep) {
  history.push({
    ...history.location,
    search: fromQuery({
      ...toQuery(history.location.search),
      pageStep
    })
  });
}

export function AgentConfigurationCreateEdit({
  pageStep,
  existingConfig
}: {
  pageStep: PageStep;
  existingConfig?: AgentConfigurationIntake;
}) {
  const [newConfig, setNewConfig] = useState<NewConfig>({
    agent_name: existingConfig?.agent_name,
    service: existingConfig?.service || {},
    settings: existingConfig?.settings || {}
  });
  const isEditMode = Boolean(existingConfig);

  useEffect(() => {
    // the user tried to edit the service of an existing config
    if (pageStep === 'choose-service-step' && isEditMode) {
      setPage('choose-settings-step');

      // the user tried to edit the settings before selecting a service
    } else if (
      pageStep === 'choose-settings-step' &&
      newConfig.service.name == null
    ) {
      setPage('choose-service-step');
    }
  }, [isEditMode, newConfig, pageStep]);

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

      {pageStep === 'choose-service-step' && (
        <ServicePage
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          onClickNext={() => setPage('choose-settings-step')}
        />
      )}

      {pageStep === 'choose-settings-step' && (
        <SettingsPage
          onClickEdit={() => setPage('choose-service-step')}
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          isEditMode={isEditMode}
        />
      )}

      {pageStep === 'review-step' && <div>Review will be here </div>}
    </>
  );
}
