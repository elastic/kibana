/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton
} from '@elastic/eui';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useCallApmApi } from '../../../../hooks/useCallApmApi';
import { APMClient } from '../../../../services/rest/createCallApmApi';
import { StringMap } from '../../../../../typings/common';
import { useKibanaCore } from '../../../../../../observability/public';

function i(id: string, defaultMessage: string, values?: StringMap<string>) {
  return i18n.translate(`xpack.apm.settings.uiIndices.${id}`, {
    defaultMessage,
    values: {}
  });
}

const APM_INDEX_LABELS = [
  {
    configurationName: 'apm_oss.sourcemapIndices',
    label: i('sourcemapIndicesLabel', 'Sourcemap Indices')
  },
  {
    configurationName: 'apm_oss.errorIndices',
    label: i('errorIndicesLabel', 'Error Indices')
  },
  {
    configurationName: 'apm_oss.onboardingIndices',
    label: i('onboardingIndicesLabel', 'Onboarding Indices')
  },
  {
    configurationName: 'apm_oss.spanIndices',
    label: i('spanIndicesLabel', 'Span Indices')
  },
  {
    configurationName: 'apm_oss.transactionIndices',
    label: i('transactionIndicesLabel', 'Transaction Indices')
  },
  {
    configurationName: 'apm_oss.metricsIndices',
    label: i('metricsIndicesLabel', 'Metrics Indices')
  },
  {
    configurationName: 'apm_oss.apmAgentConfigurationIndex',
    label: i('apmAgentConfigurationIndexLabel', 'Agent Configuration Index')
  }
];

async function saveUiIndices({
  callApmApi,
  uiIndices
}: {
  callApmApi: APMClient;
  uiIndices: StringMap<string>;
}) {
  await callApmApi({
    method: 'POST',
    pathname: '/api/apm/settings/ui-indices/save',
    params: {
      body: uiIndices
    }
  });
}

export function UiIndices() {
  const {
    notifications: { toasts }
  } = useKibanaCore();

  const [uiIndices, setUiIndices] = useState<StringMap<string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const callApmApiFromHook = useCallApmApi();

  const { data = [], refetch } = useFetcher(
    callApmApi => callApmApi({ pathname: `/api/apm/settings/ui-indices` }),
    []
  );

  useEffect(() => {
    setUiIndices(
      data.reduce(
        (acc, { configuration, savedValue }) => ({
          ...acc,
          [configuration]: savedValue
        }),
        {}
      )
    );
  }, [data]);

  const handleApplyChangesEvent = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await saveUiIndices({
        callApmApi: callApmApiFromHook,
        uiIndices
      });
      toasts.addSuccess({
        title: i('applyChanges.succeeded.title', 'Indices applied'),
        text: i(
          'applyChanges.succeeded.text',
          'The indices changes were successfully applied. These changes are reflected immediately in the APM UI'
        )
      });
    } catch (error) {
      toasts.addDanger({
        title: i('applyChanges.failed.title', 'Indices could not be applied.'),
        text: i(
          'applyChanges.failed.text',
          'Something went wrong when applying indices. Error: {errorMessage}',
          { errorMessage: error.message }
        )
      });
    }
    setIsSaving(false);
  };

  const handleChangeIndexConfigurationEvent = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setUiIndices({
      ...uiIndices,
      [name]: value
    });
  };

  return (
    <EuiPanel>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>{i('title', 'Indices')}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="s" grow={false}>
            <p>
              {i(
                'description',
                `The APM UI uses index patterns to query your APM indices. If you've customized the index names that APM Server writes events to, you may need to update these patterns for the APM UI to work. Settings here take precedence over those set in kibanad.yml.`
              )}
            </p>
            <EuiForm>
              {APM_INDEX_LABELS.map(({ configurationName, label }) => {
                const matchedConfiguration = data.find(
                  ({ configuration }) => configuration === configurationName
                );
                const defaultValue = matchedConfiguration
                  ? matchedConfiguration.defaultValue
                  : '';
                const savedUiIndexValue = uiIndices[configurationName] || '';
                return (
                  <EuiFormRow
                    key={configurationName}
                    label={label}
                    helpText={i(
                      'helpText',
                      'Overrides {configurationName}: {defaultValue}',
                      { configurationName, defaultValue }
                    )}
                    fullWidth
                  >
                    <EuiFieldText
                      fullWidth
                      name={configurationName}
                      placeholder={defaultValue}
                      value={savedUiIndexValue}
                      onChange={handleChangeIndexConfigurationEvent}
                    />
                  </EuiFormRow>
                );
              })}
              <EuiSpacer />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={refetch}>
                    {i('cancelButton', 'Cancel')}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={handleApplyChangesEvent}
                    isLoading={isSaving}
                  >
                    {i('applyButton', 'Apply changes')}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
    </EuiPanel>
  );
}
