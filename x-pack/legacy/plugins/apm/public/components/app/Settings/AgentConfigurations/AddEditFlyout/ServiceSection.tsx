/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle, EuiSpacer, EuiFormRow } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SelectWithPlaceholder } from '../../../../shared/SelectWithPlaceholder';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../../common/environment_filter_values';
import { Config } from '../index';
import { callApmApi } from '../../../../../services/rest/callApmApi';
const t = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.apm.settings.agentConf.flyOut.serviceSection.${id}`, {
    defaultMessage
  });

const SELECT_PLACEHOLDER_LABEL = `- ${t('selectPlaceholder', 'Select')} -`;

interface Props {
  selectedConfig: Config | null;
  environment?: string;
  setEnvironment: (env: string) => void;
  serviceName?: string;
  setServiceName: (env: string) => void;
}

export function ServiceSection({
  selectedConfig,
  environment,
  setEnvironment,
  serviceName,
  setServiceName
}: Props) {
  const { data: serviceNames = [], status: serviceNamesStatus } = useFetcher(
    () => {
      return callApmApi({
        pathname: '/api/apm/settings/agent-configuration/services',
        forceCache: true
      });
    },
    [],
    { preservePreviousData: false }
  );
  const { data: environments = [], status: environmentStatus } = useFetcher(
    () => {
      if (serviceName) {
        return callApmApi({
          pathname:
            '/api/apm/settings/agent-configuration/services/{serviceName}/environments',
          params: { path: { serviceName } }
        });
      }
    },
    [serviceName],
    { preservePreviousData: false }
  );

  const environmentOptions = environments.map(({ name, alreadyExists }) => ({
    disabled: alreadyExists,
    text:
      name === ENVIRONMENT_NOT_DEFINED
        ? t('serviceEnvironmentNotSetOptionLabel', 'Not set')
        : name,
    value: name
  }));

  return (
    <>
      <EuiTitle size="xs">
        <h3>{t('title', 'Service')}</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={t('serviceNameSelectLabel', 'Name')}
        helpText={t(
          'serviceNameSelectHelpText',
          'Choose the service you want to configure.'
        )}
      >
        <SelectWithPlaceholder
          placeholder={SELECT_PLACEHOLDER_LABEL}
          isLoading={serviceNamesStatus === 'loading'}
          options={serviceNames.map(text => ({ text }))}
          value={serviceName}
          disabled={Boolean(selectedConfig) || serviceNamesStatus === 'loading'}
          onChange={e => {
            e.preventDefault();
            setServiceName(e.target.value);
            setEnvironment('');
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label={t('serviceEnvironmentSelectLabel', 'Environment')}
        helpText={t(
          'serviceEnvironmentSelectHelpText',
          'Only a single environment per configuration is supported.'
        )}
      >
        <SelectWithPlaceholder
          placeholder={SELECT_PLACEHOLDER_LABEL}
          isLoading={environmentStatus === 'loading'}
          options={environmentOptions}
          value={environment}
          disabled={
            !serviceName ||
            Boolean(selectedConfig) ||
            environmentStatus === 'loading'
          }
          onChange={e => {
            e.preventDefault();
            setEnvironment(e.target.value);
          }}
        />
      </EuiFormRow>
    </>
  );
}
