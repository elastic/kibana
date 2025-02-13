/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const ANALYZE_DATA_DRIFT_LABEL = i18n.translate(
  'xpack.dataVisualizer.dataDrift.analyzeDataDriftLabel',
  {
    defaultMessage: 'Analyze data drift',
  }
);

export const DataDriftPromptHint = ({
  refresh,
  canAnalyzeDataDrift,
}: {
  refresh: () => void;
  canAnalyzeDataDrift: boolean;
}) => {
  return (
    <EuiEmptyPrompt
      color="subdued"
      hasShadow={false}
      hasBorder={false}
      css={{ minWidth: '100%' }}
      body={
        <>
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.dataDrift.emptyPromptBody"
              defaultMessage="The Data Drift Viewer visualizes changes in the model input data, which can lead to model performance degradation over time. Detecting data drifts enables you to identify potential performance issues."
            />
          </p>

          <EuiButton
            disabled={!canAnalyzeDataDrift}
            fill
            size="m"
            onClick={refresh}
            iconType="visTagCloud"
            data-test-subj="runDataDriftAnalysis"
            aria-label={ANALYZE_DATA_DRIFT_LABEL}
          >
            {ANALYZE_DATA_DRIFT_LABEL}
          </EuiButton>
        </>
      }
      data-test-subj="dataDriftRunAnalysisEmptyPrompt"
    />
  );
};
