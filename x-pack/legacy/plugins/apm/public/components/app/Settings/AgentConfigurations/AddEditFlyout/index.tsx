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
import { useFetcher } from '../../../../../hooks/useFetcher';
import { isRumAgentName } from '../../../../../../common/agent_name';
const t = (id: string, defaultMessage: string, values?: Record<string, any>) =>
  i18n.translate(`xpack.apm.settings.agentConf.${id}`, {
    defaultMessage,
    values
  });

interface Settings {
  transaction_sample_rate: number;
  capture_body?: string;
  transaction_max_spans?: number;
}

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

  const { data: agentName } = useFetcher(
    () => {
      if (serviceName) {
        return callApmApi({
          pathname:
            '/api/apm/settings/agent-configuration/services/{serviceName}/agent_name',
          params: { path: { serviceName } }
        });
      }
    },
    [serviceName],
    { preservePreviousData: false }
  );

  // config settings
  const [sampleRate, setSampleRate] = useState<string>(
    (
      idx(selectedConfig, _ => _.settings.transaction_sample_rate) ||
      defaultSettings.TRANSACTION_SAMPLE_RATE
    ).toString()
  );
  const [captureBody, setCaptureBody] = useState<string>(
    idx(selectedConfig, _ => _.settings.capture_body) ||
      defaultSettings.CAPTURE_BODY
  );
  const [transactionMaxSpans, setTransactionMaxSpans] = useState<string>(
    (
      idx(selectedConfig, _ => _.settings.transaction_max_spans) ||
      defaultSettings.TRANSACTION_MAX_SPANS
    ).toString()
  );

  const isRumService = isRumAgentName(agentName);
  const isSampleRateValid = isRight(transactionSampleRateRt.decode(sampleRate));
  const isTransactionMaxSpansValid = isRight(
    transactionMaxSpansRt.decode(transactionMaxSpans)
  );
  const isFormValid =
    !!agentName &&
    !!serviceName &&
    !!environment &&
    isSampleRateValid &&
    (isRumService || (!!captureBody && isTransactionMaxSpansValid));

  const handleSubmitEvent = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);

    if (!agentName) {
      throw new Error('Missing agent_name');
    }

    await saveConfig({
      serviceName,
      environment,
      sampleRate,
      captureBody,
      transactionMaxSpans,
      configurationId: selectedConfig ? selectedConfig.id : undefined,
      agentName
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
                ? t('editConfigTitle', 'Edit configuration')
                : t('createConfigTitle', 'Create configuration')}
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
  configurationId,
  agentName
}: {
  serviceName: string;
  environment: string;
  sampleRate: string;
  captureBody: string;
  transactionMaxSpans: string;
  configurationId?: string;
  agentName: string;
}) {
  trackEvent({ app: 'apm', name: 'save_agent_configuration' });

  try {
    const settings: Settings = {
      transaction_sample_rate: Number(sampleRate)
    };

    if (!isRumAgentName(agentName)) {
      settings.capture_body = captureBody;
      settings.transaction_max_spans = Number(transactionMaxSpans);
    }

    const configuration = {
      agent_name: agentName,
      service: {
        name: serviceName,
        environment:
          environment === ENVIRONMENT_NOT_DEFINED ? undefined : environment
      },
      settings
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
