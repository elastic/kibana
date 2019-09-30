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
import { idx } from '@kbn/elastic-idx';
import React, { useState } from 'react';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { isRight } from 'fp-ts/lib/Either';
import { transactionSampleRateRt } from '../../../../../../common/runtime_types/transaction_sample_rate_rt';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../../common/environment_filter_values';
import { callApmApi } from '../../../../../services/rest/callApmApi';
import { trackEvent } from '../../../../../../../infra/public/hooks/use_track_metric';
import { Config } from '../index';
import { SettingsSection } from './SettingsSection';
import { ServiceSection } from './ServiceSection';
import { DeleteSection } from './DeleteSection';
import { transactionMaxSpansRt } from '../../../../../../common/runtime_types/transaction_max_spans_rt';
const t = (id: string, defaultMessage: string, values?: Record<string, any>) =>
  i18n.translate(`xpack.apm.settings.agentConf.${id}`, {
    defaultMessage,
    values
  });

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
  const [isSaving, setIsSaving] = useState(false);

  // config conditions (servie)
  const [serviceName, setServiceName] = useState<string>(
    selectedConfig ? selectedConfig.service.name : ''
  );
  const [environment, setEnvironment] = useState<string>(
    selectedConfig
      ? selectedConfig.service.environment || ENVIRONMENT_NOT_DEFINED
      : ''
  );

  // config settings
  const [sampleRate, setSampleRate] = useState<string>(
    (
      idx(selectedConfig, _ => _.settings.transaction_sample_rate) || ''
    ).toString()
  );
  const [captureBody, setCaptureBody] = useState<string>(
    idx(selectedConfig, _ => _.settings.capture_body) || ''
  );
  const [transactionMaxSpans, setTransactionMaxSpans] = useState<string>(
    (
      idx(selectedConfig, _ => _.settings.transaction_max_spans) || ''
    ).toString()
  );

  const isSampleRateValid = isRight(transactionSampleRateRt.decode(sampleRate));
  const isTransactionMaxSpansValid = isRight(
    transactionMaxSpansRt.decode(transactionMaxSpans)
  );
  const isFormValid =
    !!serviceName &&
    !!environment &&
    isSampleRateValid &&
    !!captureBody &&
    isTransactionMaxSpansValid;

  const handleSubmitEvent = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);

    if (sampleRate === '' || captureBody === '' || transactionMaxSpans === '') {
      throw new Error('Missing arguments');
    }

    await saveConfig({
      serviceName,
      environment,
      sampleRate,
      captureBody,
      transactionMaxSpans,
      configurationId: selectedConfig ? selectedConfig.id : undefined
    });
    setIsSaving(false);
    onSaved();
  };

  return (
    <EuiPortal>
      <EuiFlyout size="s" onClose={onClose} ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            {selectedConfig ? (
              <h2>{t('editConfigTitle', 'Edit configuration')}</h2>
            ) : (
              <h2>{t('createConfigTitle', 'Create configuration')}</h2>
            )}
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
                selectedConfig={selectedConfig}
                environment={environment}
                setEnvironment={setEnvironment}
                serviceName={serviceName}
                setServiceName={setServiceName}
              />

              <EuiSpacer />

              <SettingsSection
                sampleRate={{
                  value: sampleRate,
                  set: setSampleRate,
                  isValid: isSampleRateValid
                }}
                captureBody={{
                  value: captureBody,
                  set: setCaptureBody
                }}
                transactionMaxSpans={{
                  value: transactionMaxSpans,
                  set: setTransactionMaxSpans,
                  isValid: isTransactionMaxSpansValid
                }}
              />

              {selectedConfig ? (
                <DeleteSection
                  selectedConfig={selectedConfig}
                  onDeleted={onDeleted}
                />
              ) : null}
            </form>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                {t('cancelButtonLabel', 'Cancel')}
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
                {t('saveConfigurationButtonLabel', 'Save configuration')}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
}

async function saveConfig({
  serviceName,
  environment,
  sampleRate,
  captureBody,
  transactionMaxSpans,
  configurationId
}: {
  serviceName: string;
  environment: string | undefined;
  sampleRate: string;
  captureBody: string;
  transactionMaxSpans: string;
  configurationId?: string;
}) {
  trackEvent({ app: 'apm', name: 'save_agent_configuration' });

  try {
    const configuration = {
      agent_name: 'TODO',
      service: {
        name: serviceName,
        environment:
          environment === ENVIRONMENT_NOT_DEFINED ? undefined : environment
      },
      settings: {
        transaction_sample_rate: Number(sampleRate),
        capture_body: captureBody,
        transaction_max_spans: Number(transactionMaxSpans)
      }
    };

    if (configurationId) {
      await callApmApi({
        pathname: '/api/apm/settings/agent-configuration/{configurationId}',
        method: 'PUT',
        params: {
          path: { configurationId },
          body: configuration
        }
      });
    } else {
      await callApmApi({
        pathname: '/api/apm/settings/agent-configuration/new',
        method: 'POST',
        params: {
          body: configuration
        }
      });
    }

    toastNotifications.addSuccess({
      title: t('saveConfig.succeeded.title', 'Configuration saved'),
      text: t(
        'saveConfig.succeeded.text',
        'The configuration for {serviceName} was saved. It will take some time to propagate to the agents.',
        { serviceName: `"${serviceName}"` }
      )
    });
  } catch (error) {
    toastNotifications.addDanger({
      title: t('saveConfig.failed.title', 'Configuration could not be saved'),
      text: t(
        'saveConfig.failed.text',
        'Something went wrong when saving the configuration for {serviceName}. Error: {errorMessage}',
        { serviceName: `"${serviceName}"`, errorMessage: `"${error.message}"` }
      )
    });
  }
}
