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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiPortal,
  EuiTitle,
  EuiText,
  EuiSpacer
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isRight } from 'fp-ts/lib/Either';
import { useCallApmApi } from '../../../../../hooks/useCallApmApi';
import { transactionSampleRateRt } from '../../../../../../common/runtime_types/transaction_sample_rate_rt';
import { Config } from '../index';
import { SettingsSection } from './SettingsSection';
import { ServiceSection } from './ServiceSection';
import { DeleteButton } from './DeleteButton';
import { transactionMaxSpansRt } from '../../../../../../common/runtime_types/transaction_max_spans_rt';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { isRumAgentName } from '../../../../../../common/agent_name';
import { ALL_OPTION_VALUE } from '../../../../../../common/agent_configuration_constants';
import { saveConfig } from './saveConfig';
import { useApmPluginContext } from '../../../../../hooks/useApmPluginContext';

const defaultSettings = {
  TRANSACTION_SAMPLE_RATE: '1.0',
  CAPTURE_BODY: 'off',
  TRANSACTION_MAX_SPANS: '500'
};

interface Props {
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  selectedConfig: Config | null;
}

export function AddEditFlyout({
  onClose,
  onSaved,
  onDeleted,
  selectedConfig
}: Props) {
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);

  const callApmApiFromHook = useCallApmApi();

  // config conditions (service)
  const [serviceName, setServiceName] = useState<string>(
    selectedConfig ? selectedConfig.service.name || ALL_OPTION_VALUE : ''
  );
  const [environment, setEnvironment] = useState<string>(
    selectedConfig ? selectedConfig.service.environment || ALL_OPTION_VALUE : ''
  );

  const { data: { agentName } = { agentName: undefined } } = useFetcher(
    callApmApi => {
      if (serviceName === ALL_OPTION_VALUE) {
        return Promise.resolve({ agentName: undefined });
      }

      if (serviceName) {
        return callApmApi({
          pathname: '/api/apm/settings/agent-configuration/agent_name',
          params: { query: { serviceName } }
        });
      }
    },
    [serviceName],
    { preservePreviousData: false }
  );

  // config settings
  const [sampleRate, setSampleRate] = useState<string>(
    (
      selectedConfig?.settings.transaction_sample_rate ||
      defaultSettings.TRANSACTION_SAMPLE_RATE
    ).toString()
  );
  const [captureBody, setCaptureBody] = useState<string>(
    selectedConfig?.settings.capture_body || defaultSettings.CAPTURE_BODY
  );
  const [transactionMaxSpans, setTransactionMaxSpans] = useState<string>(
    (
      selectedConfig?.settings.transaction_max_spans ||
      defaultSettings.TRANSACTION_MAX_SPANS
    ).toString()
  );

  const isRumService = isRumAgentName(agentName);
  const isSampleRateValid = isRight(transactionSampleRateRt.decode(sampleRate));
  const isTransactionMaxSpansValid = isRight(
    transactionMaxSpansRt.decode(transactionMaxSpans)
  );

  const isFormValid =
    !!serviceName &&
    !!environment &&
    isSampleRateValid &&
    // captureBody and isTransactionMaxSpansValid are required except if service is RUM
    (isRumService || (!!captureBody && isTransactionMaxSpansValid)) &&
    // agent name is required, except if serviceName is "all"
    (serviceName === ALL_OPTION_VALUE || agentName !== undefined);

  const handleSubmitEvent = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);

    await saveConfig({
      callApmApi: callApmApiFromHook,
      serviceName,
      environment,
      sampleRate,
      captureBody,
      transactionMaxSpans,
      configurationId: selectedConfig ? selectedConfig.id : undefined,
      agentName,
      toasts
    });
    setIsSaving(false);
    onSaved();
  };

  return (
    <EuiPortal>
      <EuiFlyout size="s" onClose={onClose} ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2>
              {selectedConfig
                ? i18n.translate(
                    'xpack.apm.settings.agentConf.editConfigTitle',
                    { defaultMessage: 'Edit configuration' }
                  )
                : i18n.translate(
                    'xpack.apm.settings.agentConf.createConfigTitle',
                    { defaultMessage: 'Create configuration' }
                  )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText size="s">
            This allows you to fine-tune your agent configuration directly in
            Kibana. Best of all, changes are automatically propagated to your
            APM agents so there’s no need to redeploy.
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
              <ServiceSection
                isReadOnly={Boolean(selectedConfig)}
                //
                // environment
                environment={environment}
                setEnvironment={setEnvironment}
                //
                // serviceName
                serviceName={serviceName}
                setServiceName={setServiceName}
              />

              <EuiSpacer />

              <SettingsSection
                isRumService={isRumService}
                //
                // sampleRate
                sampleRate={sampleRate}
                setSampleRate={setSampleRate}
                isSampleRateValid={isSampleRateValid}
                //
                // captureBody
                captureBody={captureBody}
                setCaptureBody={setCaptureBody}
                //
                // transactionMaxSpans
                transactionMaxSpans={transactionMaxSpans}
                setTransactionMaxSpans={setTransactionMaxSpans}
                isTransactionMaxSpansValid={isTransactionMaxSpansValid}
              />
            </form>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {selectedConfig ? (
                <DeleteButton
                  selectedConfig={selectedConfig}
                  onDeleted={onDeleted}
                />
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onClose}>
                    {i18n.translate(
                      'xpack.apm.settings.agentConf.cancelButtonLabel',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
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
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
}
