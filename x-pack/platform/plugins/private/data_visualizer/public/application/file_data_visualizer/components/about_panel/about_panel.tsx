/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo } from 'react';
import { css } from '@emotion/react';

import { useEuiTheme, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPageTemplate,
  EuiHorizontalRule,
  EuiFilePicker,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';

import { WelcomeContent } from './welcome_content';

interface Props {
  onFilePickerChange(files: FileList | null): void;
  hasPermissionToImport: boolean;
}

export const AboutPanel: FC<Props> = ({ onFilePickerChange, hasPermissionToImport }) => {
  const { euiTheme } = useEuiTheme();

  const aboutPanelContentStyle = useMemo(
    () =>
      css({
        '.euiFilePicker__icon': {
          width: euiTheme.size.xxl,
          height: euiTheme.size.xxl,
        },
      }),
    [euiTheme]
  );

  return (
    <EuiPageTemplate.Section alignment="center" data-test-subj="dataVisualizerPageFileUpload">
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={true}>
          <WelcomeContent hasPermissionToImport={hasPermissionToImport} />

          <EuiHorizontalRule margin="l" />

          <EuiFormRow
            label={i18n.translate('xpack.dataVisualizer.file.aboutPanel.uploadDataLabel', {
              defaultMessage: 'Upload data',
            })}
            fullWidth
          >
            <EuiFilePicker
              id="filePicker"
              fullWidth
              initialPromptText={i18n.translate(
                'xpack.dataVisualizer.file.aboutPanel.selectOrDragAndDropFileDescription',
                {
                  defaultMessage: 'Select or drag and drop a file',
                }
              )}
              onChange={(files) => onFilePickerChange(files)}
              css={aboutPanelContentStyle}
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};

export const LoadingPanel: FC = () => {
  return (
    <EuiPageTemplate.Section alignment="center" data-test-subj="dataVisualizerPageFileLoading">
      <EuiPageTemplate.EmptyPrompt
        title={
          <EuiTitle size="s">
            <h1 role="alert">
              <FormattedMessage
                id="xpack.dataVisualizer.file.aboutPanel.analyzingDataTitle"
                defaultMessage="Analyzing data"
              />
            </h1>
          </EuiTitle>
        }
      >
        <EuiLoadingSpinner size="xl" />
      </EuiPageTemplate.EmptyPrompt>
    </EuiPageTemplate.Section>
  );
};
