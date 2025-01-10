/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiButton } from '@elastic/eui';
import type { TestPipelineFlyoutTab } from './test_pipeline_tabs';

const i18nTexts = {
  buttonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.testPipeline.outputButtonLabel',
    {
      defaultMessage: 'View output',
    }
  ),
};

interface Props {
  openFlyout: (activeFlyoutTab: TestPipelineFlyoutTab) => void;
}

export const TestOutputButton: FunctionComponent<Props> = ({ openFlyout }) => {
  return (
    <EuiButton size="s" onClick={() => openFlyout('output')} data-test-subj="viewOutputButton">
      {i18nTexts.buttonLabel}
    </EuiButton>
  );
};
