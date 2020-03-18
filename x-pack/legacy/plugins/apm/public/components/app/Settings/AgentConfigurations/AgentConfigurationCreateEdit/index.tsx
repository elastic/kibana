/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FetcherResult, FETCH_STATUS } from '../../../../../hooks/useFetcher';
import { history } from '../../../../../utils/history';
import {
  AgentConfigurationIntake,
  AgentConfiguration
} from '../../../../../../../../../plugins/apm/common/runtime_types/agent_configuration/configuration_types';
import { ServicePage } from './ServicePage/ServicePage';
import { SettingsPage } from './SettingsPage/SettingsPage';
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

function getUnsavedChanges({
  newConfig,
  existingConfig
}: {
  newConfig: AgentConfigurationIntake;
  existingConfig?: AgentConfigurationIntake;
}) {
  return Object.fromEntries(
    Object.entries(newConfig.settings).filter(([key, value]) => {
      const existingValue = existingConfig?.settings?.[key];

      // don't highlight changes that were added and removed
      if (value === '' && existingValue == null) {
        return false;
      }

      return existingValue !== value;
    })
  );
}

export function AgentConfigurationCreateEdit({
  pageStep,
  existingConfigResult
}: {
  pageStep: PageStep;
  existingConfigResult?: FetcherResult<AgentConfiguration>;
}) {
  const [newConfig, setNewConfig] = useState<AgentConfigurationIntake>({
    agent_name: undefined,
    service: {},
    settings: {}
  });
  const isEditMode = Boolean(existingConfigResult);
  const existingConfig = existingConfigResult?.data;

  // update newConfig when existingConfig has loaded
  useEffect(() => {
    setNewConfig({
      agent_name: existingConfig?.agent_name,
      service: existingConfig?.service || {},
      settings: existingConfig?.settings || {}
    });
  }, [existingConfig]);

  useEffect(() => {
    // the user tried to edit the service of an existing config
    if (pageStep === 'choose-service-step' && isEditMode) {
      setPage('choose-settings-step');
    }
  }, [isEditMode, newConfig, pageStep]);

  const unsavedChanges = getUnsavedChanges({ newConfig, existingConfig });

  return (
    <>
      <EuiTitle>
        <h2>
          {isEditMode
            ? i18n.translate('xpack.apm.agentConfig.editConfigTitle', {
                defaultMessage: 'Edit configuration'
              })
            : i18n.translate('xpack.apm.agentConfig.createConfigTitle', {
                defaultMessage: 'Create configuration'
              })}
        </h2>
      </EuiTitle>

      <EuiText size="s">
        {i18n.translate('xpack.apm.agentConfig.newConfig.description', {
          defaultMessage: `This allows you to fine-tune your agent configuration directly in
        Kibana. Best of all, changes are automatically propagated to your APM
        agents so there’s no need to redeploy.`
        })}
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
          isLoading={existingConfigResult?.status === FETCH_STATUS.LOADING}
          unsavedChanges={unsavedChanges}
          onClickEdit={() => setPage('choose-service-step')}
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          isEditMode={isEditMode}
        />
      )}

      {/*
      TODO: Add review step
      {pageStep === 'review-step' && <div>Review will be here </div>}
      */}
    </>
  );
}
