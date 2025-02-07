/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { UpdateIndexState } from '../../../use_readonly';
import { FrozenCallOut } from '../frozen_callout';
import { StepProgress, StepProgressStep } from '../../../../../common/step_progress';
import { ReindexState } from '../../../use_reindex';

interface UpdateIndexFlyoutStepProps {
  action: 'unfreeze' | 'makeReadonly';
  closeFlyout: () => void;
  meta: ReindexState['meta'];
  indexName: string;
  updateIndexState: UpdateIndexState;
  retry: () => void;
}

const ErrorCallout: React.FunctionComponent<{ reason: string }> = ({ reason }) => (
  <EuiCallOut color="danger" title="There was an error">
    <EuiText>
      <p>{reason}</p>
    </EuiText>
  </EuiCallOut>
);

/**
 * In charge of rendering the result of the make read-only calls
 */
export const UpdateIndexFlyoutStep: React.FunctionComponent<UpdateIndexFlyoutStepProps> = ({
  action,
  closeFlyout,
  meta,
  indexName,
  updateIndexState,
  retry,
}) => {
  const { status, failedBefore, reason } = updateIndexState;
  const title =
    action === 'makeReadonly' ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.readonlyStepTitle"
        defaultMessage="Setting {indexName} index to read-only."
        values={{
          indexName: <EuiCode>{indexName}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.readonlyStepTitle"
        defaultMessage="Unfreezing {indexName} index."
        values={{
          indexName: <EuiCode>{indexName}</EuiCode>,
        }}
      />
    );

  const steps: StepProgressStep[] = [
    {
      title,
      status,
      ...(reason && { children: <ErrorCallout {...{ reason }} /> }),
    },
  ];

  return (
    <Fragment>
      <EuiFlyoutBody>
        {meta.isFrozen && <FrozenCallOut />}
        <EuiTitle size="xs">
          <h3>
            {(status === 'inProgress' || status === 'incomplete') && (
              <FormattedMessage
                id="xpack.upgradeAssistant.index.flyout.updateStep.inProgressText"
                defaultMessage="Upgrade in progress…"
              />
            )}
            {status === 'complete' && (
              <FormattedMessage
                id="xpack.upgradeAssistant.index.flyout.updateStep.completeText"
                defaultMessage="Operation completed"
              />
            )}
            {status === 'failed' && (
              <FormattedMessage
                id="xpack.upgradeAssistant.index.flyout.updateStep.failedText"
                defaultMessage="Operation failed"
              />
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer />
        <StepProgress steps={steps} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.index.flyout.updateStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          {status !== 'complete' && failedBefore && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={retry}
                isLoading={status === 'inProgress'}
                disabled={status === 'inProgress'}
                data-test-subj="startIndexReindexingButton"
              >
                <FormattedMessage
                  id="xpack.upgradeAssistant.index.flyout.updateStep.retry"
                  defaultMessage="Retry"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
