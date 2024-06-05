/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldPassword, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface OpenaiFormProps {
  organizationId: string;
  setOrganizationId: (organizationId: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  endpointUrl: string;
  setEndpointUrl: (endpointUrl: string) => void;
  modelId: string;
  setModelId: (modelId: string) => void;
}
export const OpenaiForm: React.FC<OpenaiFormProps> = ({
  organizationId,
  setOrganizationId,
  apiKey,
  setApiKey,
  endpointUrl,
  setEndpointUrl,
  modelId,
  setModelId,
}) => {
  return (
    <EuiForm component="form" fullWidth>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate(
          'xpack.ml.addInferenceEndpoint.connectToApi.openaiOrganizationID.label',
          {
            defaultMessage: 'Organization ID',
          }
        )}
        hasChildLabel={false}
      >
        <EuiFieldText
          data-test-subj="openaiOrganizationId"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate('xpack.ml.addInferenceEndpoint.connectToApi.openaiApiKey.label', {
          defaultMessage: 'API Key',
        })}
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="openaiApiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.ml.addInferenceEndpoint.connectToApi.openaiEndpointUrl.label',
          {
            defaultMessage: 'Endpoint URL',
          }
        )}
      >
        <EuiFieldText
          data-test-subj="openaiModelEndpointUrl"
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate('xpack.ml.addInferenceEndpoint.connectToApi.openaiModel.label', {
          defaultMessage: 'Model',
        })}
      >
        <EuiFieldText
          data-test-subj="openaiModel"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
