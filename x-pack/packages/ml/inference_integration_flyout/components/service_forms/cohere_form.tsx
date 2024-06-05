/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldPassword, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface CohereFormProps {
  modelId: string;
  setModelId: (modelId: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
}
export const CohereForm: React.FC<CohereFormProps> = ({
  modelId,
  setModelId,
  apiKey,
  setApiKey,
}) => {
  return (
    <EuiForm component="form" fullWidth>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate('xpack.ml.addInferenceEndpoint.connectToApi.cohereModelID.label', {
          defaultMessage: 'Model ID',
        })}
        hasChildLabel={false}
      >
        <EuiFieldText
          data-test-subj="cohereModelId"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate('xpack.ml.addInferenceEndpoint.connectToApi.cohereApiKey.label', {
          defaultMessage: 'Api Key',
        })}
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="cohereApiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
