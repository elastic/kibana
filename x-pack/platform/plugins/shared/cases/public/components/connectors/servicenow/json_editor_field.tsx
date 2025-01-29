/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFormRow } from '@elastic/eui';

import { XJsonLang } from '@kbn/monaco';

import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { CodeEditor } from '@kbn/code-editor';

import {
  getFieldValidityAndErrorMessage,
  type FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';

interface Props {
  field: FieldHook<unknown, string>;
  paramsProperty: string;
  ariaLabel?: string;
  onBlur?: () => void;
  dataTestSubj?: string;
  euiCodeEditorProps?: { [key: string]: unknown };
}

const { useXJsonMode } = XJson;

export const JsonEditorField: React.FunctionComponent<Props> = ({
  field,
  paramsProperty,
  ariaLabel,
  dataTestSubj,
  euiCodeEditorProps = {},
}) => {
  const { label: fieldLabel, helpText, value: inputTargetValue, setValue } = field;
  const { errorMessage } = getFieldValidityAndErrorMessage(field);

  const onDocumentsChange = useCallback(
    (updatedJson: string) => {
      setValue(updatedJson);
    },
    [setValue]
  );
  const errors = errorMessage ? [errorMessage] : [];

  const label =
    fieldLabel ??
    i18n.translate('xpack.cases.jsonEditorField.defaultLabel', {
      defaultMessage: 'JSON Editor',
    });

  const { convertToJson, setXJson, xJson } = useXJsonMode(inputTargetValue ?? null);

  useEffect(() => {
    if (!xJson && inputTargetValue) {
      setXJson(inputTargetValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTargetValue]);

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      fullWidth
      error={errors}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      label={label}
      helpText={helpText}
    >
      <CodeEditor
        languageId={XJsonLang.ID}
        options={{
          renderValidationDecorations: xJson ? 'on' : 'off', // Disable error underline when empty
          lineNumbers: 'on',
          fontSize: 14,
          minimap: {
            enabled: false,
          },
          scrollBeyondLastLine: false,
          folding: true,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        }}
        value={xJson}
        width="100%"
        height="200px"
        data-test-subj={`${paramsProperty}JsonEditor`}
        aria-label={ariaLabel}
        {...euiCodeEditorProps}
        onChange={(xjson: string) => {
          setXJson(xjson);
          // Keep the documents in sync with the editor content
          onDocumentsChange(convertToJson(xjson));
        }}
      />
    </EuiFormRow>
  );
};

JsonEditorField.displayName = 'JsonEditorField';
