/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiHeader
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isString } from 'lodash';
import { AgentConfigurationIntake } from '../../../../../../../../../plugins/apm/server/lib/settings/agent_configuration/configuration_types';
import { useCallApmApi } from '../../../../../hooks/useCallApmApi';
import { Config } from '../index';
import { SettingsSection } from './SettingsSection';
import { ServiceForm } from '../../../../shared/ServiceForm';
import { DeleteButton } from './DeleteButton';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { ALL_OPTION_VALUE } from '../../../../../../../../../plugins/apm/common/agent_configuration_constants';
import { saveConfig } from './saveConfig';
import { useApmPluginContext } from '../../../../../hooks/useApmPluginContext';
import { useUiTracker } from '../../../../../../../../../plugins/observability/public';

export interface ConfigUnvalidated {
  agent_name?: unknown;
  service: {
    name?: unknown;
    environment?: unknown;
  };
  settings: {
    [x: string]: unknown;
  };
}

export function AgentConfigurationCreateEdit({
  existingConfig
}: {
  existingConfig: AgentConfigurationIntake;
}) {
  const callApmApiFromHook = useCallApmApi();
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);

  const [newConfig, setNewConfig] = useState<ConfigUnvalidated>({
    agent_name: existingConfig?.agent_name,
    service: existingConfig?.service || {},
    settings: existingConfig?.settings || {}
  });
  const [validations, setValidations] = useState<Record<string, boolean>>({});
  const isFormValid = Object.values(validations).every(v => v);

  // get a telemetry UI event tracker
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const { data: { agentName } = { agentName: undefined } } = useFetcher(
    callApmApi => {
      const serviceName = newConfig.service.name;

      // TODO: perhaps use service name validator
      if (!isString(serviceName) || serviceName.length === 0) {
        return;
      }

      return callApmApi({
        pathname: '/api/apm/settings/agent-configuration/agent_name',
        params: { query: { serviceName } }
      });
    },
    [newConfig.service.name],
    { preservePreviousData: false }
  );

  const handleSubmitEvent = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);

    trackApmEvent({ metric: 'save_agent_configuration' });

    await saveConfig({
      callApmApi: callApmApiFromHook,
      config: newConfig as AgentConfigurationIntake,
      isExistingConfig: Boolean(existingConfig),
      toasts
    });
    setIsSaving(false);
  };

  return (
    <div>
      <EuiHeader>
        <EuiTitle>
          <h2>
            {existingConfig
              ? i18n.translate('xpack.apm.settings.agentConf.editConfigTitle', {
                  defaultMessage: 'Edit configuration'
                })
              : i18n.translate(
                  'xpack.apm.settings.agentConf.createConfigTitle',
                  { defaultMessage: 'Create configuration' }
                )}
          </h2>
        </EuiTitle>
      </EuiHeader>
      <div>
        <EuiText size="s">
          This allows you to fine-tune your agent configuration directly in
          Kibana. Best of all, changes are automatically propagated to your APM
          agents so there’s no need to redeploy.
        </EuiText>

        <EuiSpacer size="m" />

        <EuiForm>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <form
            onKeyPress={e => {
              const didClickEnter = e.which === 13;
              if (didClickEnter) {
                handleSubmitEvent(e);
              }
            }}
          >
            <ServiceForm
              isReadOnly={Boolean(existingConfig)}
              service={newConfig.service}
              onChange={(key, value) => {}}
            />

            <EuiSpacer />

            <SettingsSection
              agentName={agentName}
              configSettings={newConfig.settings}
              onChange={(key, value) => {
                setNewConfig(c => ({
                  ...c,
                  settings: {
                    ...c.settings,
                    [c.key]: value
                  }
                }));
              }}
            />
          </form>
        </EuiForm>
      </div>
      <div>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {existingConfig ? (
              <DeleteButton existingConfig={existingConfig} />
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton
                  type="submit"
                  fill
                  isLoading={isSaving}
                  iconSide="right"
                  isDisabled={!isFormValid}
                  onClick={handleSubmitEvent}
                >
                  {i18n.translate(
                    'xpack.apm.settings.agentConf.saveConfigurationButtonLabel',
                    { defaultMessage: 'Save' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
}
