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

const INDICES = [
  { configuration: 'apm_oss.sourcemapIndices', label: 'Sourcemap Indices' },
  { configuration: 'apm_oss.errorIndices', label: 'Error Indices' },
  { configuration: 'apm_oss.onboardingIndices', label: 'Onboarding Indices' },
  { configuration: 'apm_oss.spanIndices', label: 'Span Indices' },
  { configuration: 'apm_oss.transactionIndices', label: 'Transaction Indices' },
  { configuration: 'apm_oss.metricsIndices', label: 'Metrics Indices' },
  {
    configuration: 'apm_oss.apmAgentConfigurationIndex',
    label: 'Agent Configuration Index'
  }
];

async function saveUiIndices({
  callApmApi,
  uiIndices
}: {
  callApmApi: APMClient;
  uiIndices: { [key: string]: string };
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
  const [uiIndices, setUiIndices] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const callApmApiFromHook = useCallApmApi();

  const { data = [], refetch } = useFetcher(
    callApmApi => callApmApi({ pathname: `/api/apm/settings/ui-indices` }),
    [],
    { preservePreviousData: false }
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
    await saveUiIndices({
      callApmApi: callApmApiFromHook,
      uiIndices
    });
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
            <h2>
              {i18n.translate('xpack.apm.settings.uiIndicesTitle', {
                defaultMessage: 'UI Indices'
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText size="s" grow={false}>
            <p>
              The APM UI uses index patterns to query your APM indices. If
              you've customized the index names that APM Server writes events
              to, you may need to update these patterns for the APM UI to work.
              Settings here take precedence over those set in kibana.yml.
            </p>
            <EuiForm>
              {INDICES.map(({ configuration, label }) => {
                const matchedConfiguration = data.find(
                  ({ configuration: config }) => config === configuration
                );
                const fallbackValue = matchedConfiguration
                  ? matchedConfiguration.defaultValue
                  : '';
                const savedUiIndexValue = uiIndices[configuration] || '';
                return (
                  <EuiFormRow
                    key={configuration}
                    label={label}
                    helpText={`Overrides ${configuration}: ${fallbackValue}`}
                    fullWidth
                  >
                    <EuiFieldText
                      fullWidth
                      name={configuration}
                      placeholder={fallbackValue}
                      value={savedUiIndexValue}
                      onChange={handleChangeIndexConfigurationEvent}
                    />
                  </EuiFormRow>
                );
              })}
              <EuiSpacer />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={refetch}>Cancel</EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={handleApplyChangesEvent}
                    isLoading={isSaving}
                  >
                    Apply changes
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
