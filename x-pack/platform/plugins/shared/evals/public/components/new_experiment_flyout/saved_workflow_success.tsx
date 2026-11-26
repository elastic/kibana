/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SaveAsWorkflowResponse } from '../../../common/experiments/run_experiment';
import { newExperimentStrings } from './translations';

export interface SavedWorkflowSuccessProps {
  savedWorkflow: SaveAsWorkflowResponse;
  /** Deep link to the saved workflow; omitted when the base path is unavailable. */
  savedWorkflowHref?: string;
  isRunning: boolean;
  onRunNow: () => void;
  onClose: () => void;
}

/**
 * Success state shown after an experiment is saved as a workflow: confirms the
 * save and offers to run it now or open it in Workflows.
 */
export const SavedWorkflowSuccess: React.FC<SavedWorkflowSuccessProps> = ({
  savedWorkflow,
  savedWorkflowHref,
  isRunning,
  onRunNow,
  onClose,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="evalsNewExperimentFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{newExperimentStrings.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiEmptyPrompt
          iconType="checkCircleFill"
          iconColor="success"
          title={
            <h2>
              {i18n.translate('xpack.evals.newExperiment.savedTitle', {
                defaultMessage: 'Saved workflow "{name}"',
                values: { name: savedWorkflow.name },
              })}
            </h2>
          }
          body={<p>{newExperimentStrings.savedBody}</p>}
          actions={[
            <EuiButton
              key="run"
              fill
              iconType="play"
              onClick={onRunNow}
              isLoading={isRunning}
              data-test-subj="evalsSavedRunItButton"
            >
              {newExperimentStrings.savedRunIt}
            </EuiButton>,
            ...(savedWorkflowHref
              ? [
                  <EuiButton
                    key="open"
                    iconType="external"
                    href={savedWorkflowHref}
                    data-test-subj="evalsSavedOpenWorkflowButton"
                  >
                    {newExperimentStrings.savedOpen}
                  </EuiButton>,
                ]
              : []),
          ]}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="evalsSavedCloseButton">
              {newExperimentStrings.savedClose}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
