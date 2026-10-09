/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFilePicker, EuiFormRow, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';

const LABELS = {
  promptText: i18n.translate('responseOpsFormGenerator.fileUpload.promptText', {
    defaultMessage: 'Select or drag a file',
  }),
  readError: i18n.translate('responseOpsFormGenerator.fileUpload.readError', {
    defaultMessage: 'Failed to read file',
  }),
  fileLoaded: (name: string) =>
    i18n.translate('responseOpsFormGenerator.fileUpload.fileLoaded', {
      defaultMessage: '{name} loaded',
      values: { name },
    }),
};

type FileUploadWidgetProps = BaseWidgetProps<z.ZodString, Record<string, unknown>>;

/**
 * File upload widget that reads a file as text and stores the contents in a string field.
 * Useful for service account JSON keys, PEM certificates, and similar text-based credentials.
 */
export const FileUploadWidget: React.FC<FileUploadWidgetProps> = ({
  path,
  schema,
  fieldProps,
  fieldConfig,
  formConfig,
  meta,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const { getMeta } = meta;
  const schemaMeta = getMeta(schema);
  const accept = (schemaMeta?.widgetOptions as { accept?: string } | undefined)?.accept;

  return (
    <UseField path={path} config={fieldConfig}>
      {(field) => {
        const onFileChange = (files: FileList | null) => {
          setReadError(null);

          if (!files || files.length === 0) {
            setFileName(null);
            field.setValue('');
            return;
          }

          const file = files[0];
          setFileName(file.name);

          const reader = new FileReader();
          reader.onload = (e) => {
            const contents = e.target?.result;
            if (typeof contents === 'string') {
              field.setValue(contents);
            }
          };
          reader.onerror = () => {
            setReadError(LABELS.readError);
            field.setValue('');
          };
          reader.readAsText(file);
        };

        const errors = field.errors?.map((e) => e.message).filter(Boolean) ?? [];
        const isInvalid = errors.length > 0 || readError != null;

        return (
          <EuiFormRow
            label={fieldConfig.label}
            helpText={fieldProps.helpText as string | undefined}
            error={readError ? [readError] : errors}
            isInvalid={isInvalid}
            fullWidth={fieldProps.fullWidth as boolean | undefined}
          >
            <div>
              <EuiFilePicker
                initialPromptText={fileName ?? LABELS.promptText}
                onChange={onFileChange}
                accept={accept}
                disabled={formConfig.disabled as boolean | undefined}
                fullWidth
                display="default"
                data-test-subj={`generator-field-${path.replace(/\./g, '-')}`}
              />
              {fileName && Boolean(field.value) && (
                <EuiText size="xs" color="subdued" style={{ marginTop: 4 }}>
                  {LABELS.fileLoaded(fileName)}
                </EuiText>
              )}
            </div>
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
