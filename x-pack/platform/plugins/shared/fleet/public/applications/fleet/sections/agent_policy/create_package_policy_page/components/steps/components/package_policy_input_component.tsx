/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiSwitch,
  EuiFieldText,
  EuiFieldPassword,
  EuiCodeBlock,
  EuiTextArea,
  EuiComboBox,
} from '@elastic/eui';

import { CodeEditor } from '@kbn/code-editor';

import { MultiTextInput } from './multi_text_input';

import type { InputComponentProps } from './types';

export function getInputComponent({
  varDef,
  value,
  onChange,
  frozen,
  isInvalid,
  fieldLabel,
  fieldTestSelector,
  setIsDirty,
}: InputComponentProps) {
  const { multi, type, options, full_width: fullWidth } = varDef;

  if (multi) {
    return (
      <MultiTextInput
        fieldLabel={fieldLabel}
        value={value ?? []}
        onChange={onChange}
        onBlur={() => setIsDirty(true)}
        isDisabled={frozen}
        data-test-subj={`multiTextInput-${fieldTestSelector}`}
      />
    );
  }
  switch (type) {
    case 'textarea':
      return (
        <EuiTextArea
          isInvalid={isInvalid}
          value={value === undefined ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsDirty(true)}
          disabled={frozen}
          resize="vertical"
          fullWidth={fullWidth}
          data-test-subj={`textAreaInput-${fieldTestSelector}`}
        />
      );
    case 'yaml':
      return (
        <>
          {frozen ? (
            <EuiCodeBlock language="yaml" isCopyable={false} paddingSize="s">
              <pre>{value}</pre>
            </EuiCodeBlock>
          ) : (
            <>
              <div style={{ height: '300px' }}>
                <CodeEditor
                  languageId="yaml"
                  width="100%"
                  height="300px"
                  value={value}
                  allowFullScreen={true}
                  placeholder={i18n.translate('xpack.fleet.packagePolicyField.yamlPlaceholder', {
                    defaultMessage: 'Enter YAML Configuration',
                  })}
                  onChange={onChange}
                  options={{
                    minimap: {
                      enabled: false,
                    },
                    ariaLabel: i18n.translate('xpack.fleet.packagePolicyField.yamlCodeEditor', {
                      defaultMessage: 'YAML Code Editor',
                    }),
                    scrollBeyondLastLine: false,
                    wordWrap: 'off',
                    wrappingIndent: 'indent',
                    tabSize: 2,
                    // To avoid left margin
                    lineNumbers: 'off',
                    lineNumbersMinChars: 0,
                    glyphMargin: false,
                    folding: false,
                    lineDecorationsWidth: 0,
                    overviewRulerBorder: false,
                  }}
                />
              </div>
            </>
          )}
        </>
      );
    case 'bool':
      return (
        <EuiSwitch
          label={fieldLabel}
          checked={value}
          showLabel={false}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={() => setIsDirty(true)}
          disabled={frozen}
          data-test-subj={`switch-${fieldTestSelector}`}
        />
      );
    case 'password':
      return (
        <EuiFieldPassword
          type="dual"
          isInvalid={isInvalid}
          value={value === undefined ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsDirty(true)}
          disabled={frozen}
          data-test-subj={`passwordInput-${fieldTestSelector}`}
        />
      );
    case 'select':
      const selectOptions = options?.map((option) => ({
        value: option.value,
        label: option.text,
      }));
      const selectedOptions =
        value === undefined ? [] : selectOptions?.filter((option) => option.value === value);
      return (
        <EuiComboBox
          placeholder={i18n.translate('xpack.fleet.packagePolicyField.selectPlaceholder', {
            defaultMessage: 'Select an option',
          })}
          singleSelection={{ asPlainText: true }}
          options={selectOptions}
          selectedOptions={selectedOptions}
          isClearable={true}
          onChange={(newSelectedOptions: Array<{ label: string; value?: string }>) => {
            const newValue =
              newSelectedOptions.length === 0 ? undefined : newSelectedOptions[0].value;
            return onChange(newValue);
          }}
          onBlur={() => setIsDirty(true)}
          data-test-subj={`select-${fieldTestSelector}`}
        />
      );
    default:
      return (
        <EuiFieldText
          isInvalid={isInvalid}
          value={value === undefined ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsDirty(true)}
          disabled={frozen}
          data-test-subj={`textInput-${fieldTestSelector}`}
        />
      );
  }
}
