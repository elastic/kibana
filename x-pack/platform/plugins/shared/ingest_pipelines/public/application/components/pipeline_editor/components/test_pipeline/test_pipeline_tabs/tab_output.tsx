/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCodeBlock,
  EuiSpacer,
  EuiText,
  EuiSwitch,
  EuiButton,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { Document } from '../../../types';
import { TestPipelineConfig } from '../test_pipeline_flyout.container';

interface Props {
  handleTestPipeline: (
    testPipelineConfig: TestPipelineConfig,
    refreshOutputPerProcessor?: boolean
  ) => Promise<{ isSuccessful: boolean }>;
  isRunningTest: boolean;
  cachedVerbose?: boolean;
  cachedDocuments: Document[];
  testOutput?: any;
}

export const OutputTab: React.FunctionComponent<Props> = ({
  handleTestPipeline,
  isRunningTest,
  cachedVerbose,
  cachedDocuments,
  testOutput,
}) => {
  const [isVerboseEnabled, setIsVerboseEnabled] = useState(Boolean(cachedVerbose));

  let content: React.ReactNode | undefined;

  if (isRunningTest) {
    content = <EuiLoadingSpinner size="m" />;
  } else if (testOutput) {
    content = (
      <EuiCodeBlock language="json" isCopyable>
        {JSON.stringify(testOutput, null, 2)}
      </EuiCodeBlock>
    );
  }

  return (
    <div data-test-subj="outputTabContent">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.testPipelineFlyout.outputTab.descriptionText"
            defaultMessage="View the output data, or see how each processor affects the document as it passes through the pipeline."
          />
        </p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.ingestPipelines.testPipelineFlyout.outputTab.verboseSwitchLabel"
                defaultMessage="View verbose output"
              />
            }
            checked={isVerboseEnabled}
            data-test-subj="verboseOutputToggle"
            onChange={async (e) => {
              const isVerbose = e.target.checked;
              setIsVerboseEnabled(isVerbose);

              await handleTestPipeline({ documents: cachedDocuments!, verbose: isVerbose });
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={async () =>
              await handleTestPipeline(
                { documents: cachedDocuments!, verbose: isVerboseEnabled },
                true
              )
            }
            iconType="refresh"
            data-test-subj="refreshOutputButton"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.testPipelineFlyout.outputTab.descriptionLinkLabel"
              defaultMessage="Refresh output"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {content}
    </div>
  );
};
