/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFieldPassword, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
interface HuggingFaceProps {
  apiKey: string;
  url: string;
  setApiKey: (apiKey: string) => void;
  setUrl: (url: string) => void;
}
export const HuggingFaceForm: React.FC<HuggingFaceProps> = ({ apiKey, url, setApiKey, setUrl }) => {
  return (
    <EuiForm component="form" fullWidth>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate(
          'xpack.ml.addInferenceEndpoint.connectToApi.huggingFaceModelUrl.label',
          {
            defaultMessage: 'HuggingFace Model URL',
          }
        )}
        hasChildLabel={false}
      >
        <EuiFieldText
          data-test-subj="huggingFaceUrl"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate(
          'xpack.ml.addInferenceEndpoint.connectToApi.huggingFaceModelApiKey.label',
          {
            defaultMessage: 'API Key',
          }
        )}
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="huggingFaceUrlApiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
