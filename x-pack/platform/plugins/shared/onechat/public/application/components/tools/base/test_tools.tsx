/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { EsqlToolDefinitionWithSchema } from "@kbn/onechat-common";
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';

interface OnechatTestToolFlyoutProps {
  isOpen: boolean;
  isLoading?: boolean;
  tool?: EsqlToolDefinitionWithSchema;
  onClose: () => void;
}

const inputs = [
  {
    label: 'Tool ID',
    name: 'toolId',
    type: 'text',
  },
  {
    label: 'Configuration',
    name: 'configuration',
    type: 'json',
  },
  {
    label: 'Max Results',
    name: 'maxResults',
    type: 'number',
  },
]

export const OnechatTestFlyout: React.FC<OnechatTestToolFlyoutProps> = ({
  isOpen,
  isLoading,
  tool,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  
  const [formData, setFormData] = useState({
    toolId: tool?.id || '',
    configuration: JSON.stringify(tool?.configuration, null, 2),
    maxResults: '3',
  });

  if (!isOpen) {
    return null;
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExecute = () => {
    console.log('Execute test with data:', formData);
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="testFlyoutTitle">Test Tool</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={1}>
            <EuiTitle size="s">
              <h5>Inputs</h5>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiForm component="form">
              {inputs.map((input) => (
                <EuiFormRow
                  key={input.name}
                  label={input.label}
                >
                  <EuiFieldText
                    type={input.type}
                    value={formData[input.name as keyof typeof formData]}
                    onChange={(e) => handleInputChange(input.name, e.target.value)}
                    placeholder={`Enter ${input.label.toLowerCase()}`}
                    min={input.type === 'number' ? 1 : undefined}
                  />
                </EuiFormRow>
              ))}
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton fill onClick={handleExecute}>
                    Execute
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiTitle size="s">
              <h5>Response</h5>
            </EuiTitle>
            <EuiSpacer size="m" />
              <CodeEditor
                languageId="json"
                value="{}"
                fullWidth={true}
                height="400px"
                options={{
                  readOnly: true,
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

