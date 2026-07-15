/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCallOut, EuiFilePicker, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';
import { useValidateYaml } from '../hooks/use_validate_yaml';
import type { ValidatedFile, FileValidationError } from '../hooks/use_validate_yaml';

export interface UploadYamlStepProps {
  validatedFiles: ValidatedFile[];
  validationErrors: FileValidationError[];
  isValidating: boolean;
  onValidationStart: () => void;
  onValidationComplete: (result: {
    validFiles: ValidatedFile[];
    errors: FileValidationError[];
  }) => void;
}

export const UploadYamlStep = React.memo<UploadYamlStepProps>(
  ({ validatedFiles, validationErrors, isValidating, onValidationStart, onValidationComplete }) => {
    const { validateFiles } = useValidateYaml();

    const onFilesChange = useCallback(
      async (fileList: FileList | null) => {
        const files = fileList ? Array.from(fileList) : [];

        if (files.length === 0) {
          onValidationComplete({ validFiles: [], errors: [] });
          return;
        }

        onValidationStart();
        const result = await validateFiles(files);
        onValidationComplete(result);
      },
      [validateFiles, onValidationStart, onValidationComplete]
    );

    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        css={css`
          height: 100%;
        `}
      >
        <EuiFlexItem grow={validatedFiles.length === 0}>
          <EuiFilePicker
            css={
              validatedFiles.length === 0
                ? css`
                    height: 100%;
                    > div {
                      height: 100%;
                    }
                  `
                : undefined
            }
            id="template-import-file-picker"
            multiple
            accept=".yaml,.yml"
            initialPromptText={i18n.FILE_PICKER_PROMPT}
            onChange={onFilesChange}
            display="large"
            isLoading={isValidating}
            fullWidth
            data-test-subj="template-flyout-file-picker"
          />
        </EuiFlexItem>
        {validationErrors.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              title={i18n.VALIDATION_ERRORS_TITLE}
              color="danger"
              iconType="error"
              data-test-subj="template-flyout-validation-errors"
            >
              <ul>
                {validationErrors.map((error) => (
                  <li key={`${error.fileName}-${error.message}`}>{error.message}</li>
                ))}
              </ul>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        {validatedFiles.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              title={i18n.FILES_VALIDATED(validatedFiles.length)}
              color="success"
              iconType="check"
              data-test-subj="template-flyout-validation-success"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

UploadYamlStep.displayName = 'UploadYamlStep';
