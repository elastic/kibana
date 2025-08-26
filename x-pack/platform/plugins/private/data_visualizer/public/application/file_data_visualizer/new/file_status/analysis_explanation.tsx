/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiText, EuiSpacer, EuiSubSteps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';

interface Props {
  results: FindFileStructureResponse;
}

export const AnalysisExplanation: FC<Props> = ({ results }) => {
  const explanation = results.explanation!;

  return (
    <EuiText size={'s'}>
      <FormattedMessage
        id="xpack.dataVisualizer.file.explanationFlyout.content"
        defaultMessage="The logical steps that have produced the analysis results."
      />

      <EuiSpacer size="l" />
      <EuiSubSteps>
        <ul style={{ wordBreak: 'break-word' }}>
          {explanation.map((e, i) => (
            <li key={i}>
              {e}
              <EuiSpacer size="s" />
            </li>
          ))}
        </ul>
      </EuiSubSteps>
    </EuiText>
  );
};
