/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiHorizontalRule,
  EuiFilePicker,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';

import { WelcomeContent } from './welcome_content';

export const AboutPanel = injectI18n(function AboutPanel({ onFilePickerChange, intl }) {
  return (
    <EuiPage restrictWidth={1000}>
      <EuiPageBody>
        <EuiPageContent
          className="file-datavisualizer-about-panel__content"
        >
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow={true}>
              <WelcomeContent />

              <EuiHorizontalRule margin="l" />

              <div style={{ textAlign: 'center' }} >
                <EuiFilePicker
                  id="filePicker"
                  initialPromptText={intl.formatMessage({
                    id: 'xpack.ml.fileDatavisualizer.aboutPanel.selectOrDragAndDropFileDescription',
                    defaultMessage: 'Select or drag and drop a file',
                  })}
                  onChange={files => onFilePickerChange(files)}
                  className="file-datavisualizer-file-picker"
                />
              </div>
              <EuiSpacer size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
});

export function LoadingPanel() {
  return (
    <EuiPage restrictWidth={400}>
      <EuiPageBody>
        <EuiPageContent
          className="file-datavisualizer-about-panel__content"
          paddingSize="l"
        >
          <div style={{ textAlign: 'center' }}>
            <EuiTitle size="s">
              <h3 role="alert">
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.aboutPanel.analyzingDataTitle"
                  defaultMessage="Analyzing data"
                />
              </h3>
            </EuiTitle>

            <EuiSpacer size="l" />

            <EuiLoadingSpinner size="xl"/>
          </div>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
