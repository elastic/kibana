/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSubSteps,
  EuiText,
  useGeneratedHtmlId,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FileAnalysis } from '@kbn/file-upload';
import { AnalysisSummary } from './analysis_summary';

interface Props {
  fileStatus: FileAnalysis;
}
export const AnalysisExplanation: FC<Props> = ({ fileStatus }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const modalTitleId = useGeneratedHtmlId();
  const results = fileStatus.results;

  if (fileStatus.results === null) {
    return null;
  }

  return (
    <>
      <EuiButtonIcon
        onClick={() => setIsModalVisible(true)}
        iconType="inspect"
        size="xs"
        color="text"
        aria-label={i18n.translate('xpack.dataVisualizer.file.analysisSummary.inspectButtonLabel', {
          defaultMessage: 'Analysis explanation',
        })}
      />

      {isModalVisible && results?.explanation ? (
        <EuiModal aria-labelledby={modalTitleId} onClose={() => setIsModalVisible(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              <EuiIcon type="inspect" size={'l'} />{' '}
              <FormattedMessage
                id="xpack.dataVisualizer.file.explanationFlyout.title"
                defaultMessage="Analysis explanation"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <b>{fileStatus.fileName}</b>

            <EuiSpacer size="s" />

            <FormattedMessage
              id="xpack.dataVisualizer.file.explanationFlyout.content"
              defaultMessage="The logical steps that have produced the analysis results."
            />

            <EuiHorizontalRule />

            <AnalysisSummary results={results} />

            <EuiText size={'s'}>
              <EuiSpacer size="l" />
              <EuiSubSteps>
                <ul style={{ wordBreak: 'break-word' }}>
                  {results.explanation.map((e, i) => (
                    <li key={i}>
                      {e}
                      <EuiSpacer size="s" />
                    </li>
                  ))}
                </ul>
              </EuiSubSteps>
            </EuiText>
          </EuiModalBody>
        </EuiModal>
      ) : null}
    </>
  );
};
