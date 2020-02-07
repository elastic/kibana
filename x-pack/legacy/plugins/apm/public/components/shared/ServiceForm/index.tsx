/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle, EuiSpacer, EuiFormRow, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  omitAllOption,
  getOptionLabel
} from '../../../../common/agent_configuration_constants';
import { useFetcher } from '../../../hooks/useFetcher';
import { SelectWithPlaceholder } from '../SelectWithPlaceholder';

const SELECT_PLACEHOLDER_LABEL = `- ${i18n.translate(
  'xpack.apm.settings.agentConf.flyOut.serviceForm.selectPlaceholder',
  { defaultMessage: 'Select' }
)} -`;

interface Props {
  isReadOnly: boolean;
  serviceName: string;
  onServiceNameChange: (env: string) => void;
  environment: string;
  onEnvironmentChange: (env: string) => void;
}

export function ServiceForm({
  isReadOnly,
  serviceName,
  onServiceNameChange,
  environment,
  onEnvironmentChange
}: Props) {
  const { data: serviceNames = [], status: serviceNamesStatus } = useFetcher(
    callApmApi => {
      if (!isReadOnly) {
        return callApmApi({
          pathname: '/api/apm/settings/agent-configuration/services',
          forceCache: true
        });
      }
    },
    [isReadOnly],
    { preservePreviousData: false }
  );
  const { data: environments = [], status: environmentStatus } = useFetcher(
    callApmApi => {
      if (!isReadOnly && serviceName) {
        return callApmApi({
          pathname: '/api/apm/settings/agent-configuration/environments',
          params: { query: { serviceName: omitAllOption(serviceName) } }
        });
      }
    },
    [isReadOnly, serviceName],
    { preservePreviousData: false }
  );

  const ALREADY_CONFIGURED_TRANSLATED = i18n.translate(
    'xpack.apm.settings.agentConf.flyOut.serviceForm.alreadyConfiguredOption',
    { defaultMessage: 'already configured' }
  );

  const serviceNameOptions = serviceNames.map(name => ({
    text: getOptionLabel(name),
    value: name
  }));
  const environmentOptions = environments.map(
    ({ name, alreadyConfigured }) => ({
      disabled: alreadyConfigured,
      text: `${getOptionLabel(name)} ${
        alreadyConfigured ? `(${ALREADY_CONFIGURED_TRANSLATED})` : ''
      }`,
      value: name
    })
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceForm.title',
            { defaultMessage: 'Service' }
          )}
        </h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.settings.agentConf.flyOut.serviceForm.serviceNameSelectLabel',
          { defaultMessage: 'Name' }
        )}
        helpText={
          !isReadOnly &&
          i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceForm.serviceNameSelectHelpText',
            { defaultMessage: 'Choose the service you want to configure.' }
          )
        }
      >
        {isReadOnly ? (
          <EuiText>{getOptionLabel(serviceName)}</EuiText>
        ) : (
          <SelectWithPlaceholder
            placeholder={SELECT_PLACEHOLDER_LABEL}
            isLoading={serviceNamesStatus === 'loading'}
            options={serviceNameOptions}
            value={serviceName}
            disabled={serviceNamesStatus === 'loading'}
            onChange={e => {
              e.preventDefault();
              onServiceNameChange(e.target.value);
              onEnvironmentChange('');
            }}
          />
        )}
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.settings.agentConf.flyOut.serviceForm.serviceEnvironmentSelectLabel',
          { defaultMessage: 'Environment' }
        )}
        helpText={
          !isReadOnly &&
          i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceForm.serviceEnvironmentSelectHelpText',
            {
              defaultMessage:
                'Only a single environment per configuration is supported.'
            }
          )
        }
      >
        {isReadOnly ? (
          <EuiText>{getOptionLabel(environment)}</EuiText>
        ) : (
          <SelectWithPlaceholder
            placeholder={SELECT_PLACEHOLDER_LABEL}
            isLoading={environmentStatus === 'loading'}
            options={environmentOptions}
            value={environment}
            disabled={!serviceName || environmentStatus === 'loading'}
            onChange={e => {
              e.preventDefault();
              onEnvironmentChange(e.target.value);
            }}
          />
        )}
      </EuiFormRow>
    </>
  );
}
