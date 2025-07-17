/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UpdateIndexState } from '../../../use_update_index';
import { StepProgress, type StepProgressStep } from '../../../../../common/step_progress';
import type { ReindexState } from '../../../use_reindex';

interface UpdateIndexModalStepProps {
  action: 'unfreeze' | 'makeReadonly' | 'delete';
  closeModal: () => void;
  meta: ReindexState['meta'];
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

const getTitle = (actionType: UpdateIndexModalStepProps['action'], indexName: string) => {
  const messages = {
    makeReadonly: {
      id: 'xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.step.readonlyStepText',
      defaultMessage: 'Setting {indexName} index to read-only.',
    },
    unfreeze: {
      id: 'xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.step.unfreezeStepText',
      defaultMessage: 'Unfreezing {indexName} index.',
    },
    delete: {
      id: 'xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.step.deleteStepText',
      defaultMessage: 'Deleting {indexName} index.',
    },
  };

  const message = messages[actionType];
  if (!message) return null;

  return (
    <FormattedMessage
      id={message.id}
      defaultMessage={message.defaultMessage}
      values={{
        indexName: <EuiCode>{indexName}</EuiCode>,
      }}
    />
  );
};
const getModalTitle = (actionType: UpdateIndexModalStepProps['action']) => {
  const messages = {
    makeReadonly: {
      id: 'xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.step.readonlyStep.title',
      defaultMessage: 'Setting index to read-only',
    },
    unfreeze: {
      id: 'xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.step.unfreezeStep.title',
      defaultMessage: 'Unfreezing index',
    },
    delete: {
      id: 'xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.step.deleteStep.title',
      defaultMessage: 'Deleting index',
    },
  };

  const message = messages[actionType];
  if (!message) return null;

  return <FormattedMessage id={message.id} defaultMessage={message.defaultMessage} />;
};

/**
 * In charge of rendering the result of the make read-only calls
 */
export const UpdateIndexModalStep: React.FunctionComponent<UpdateIndexModalStepProps> = ({
  action,
  closeModal,
  meta,
  updateIndexState,
  retry,
}) => {
  const { indexName } = meta;
  const { status, failedBefore, reason } = updateIndexState;

  const title = getTitle(action, indexName);

  const modalTitle = getModalTitle(action);

  const steps: StepProgressStep[] = [
    {
      title,
      status,
      ...(reason && { children: <ErrorCallout {...{ reason }} /> }),
    },
  ];

  return (
    <Fragment>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="updateIndexModalTitle" size="m">
          {modalTitle}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiTitle size="xs" data-test-subj="updateIndexProgress">
          <h3>
            {(status === 'inProgress' || status === 'incomplete') && (
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.title.updateInProgressText"
                defaultMessage="Upgrade in progress…"
              />
            )}
            {status === 'complete' && (
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.title.updateCompleteText"
                defaultMessage="Operation completed"
              />
            )}
            {status === 'failed' && (
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.checklist.title.updateFailedText"
                defaultMessage="Operation failed"
              />
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer />
        <StepProgress steps={steps} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiButtonEmpty
            onClick={closeModal}
            color="primary"
            data-test-subj="closeUpdateStepButton"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
          {status !== 'complete' && failedBefore && (
            <EuiButton
              fill
              onClick={retry}
              isLoading={status === 'inProgress'}
              disabled={status === 'inProgress'}
              data-test-subj="retryUpdateStepButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.updateStep.retryButtonLabel"
                defaultMessage="Retry"
              />
            </EuiButton>
          )}
        </EuiFlexGroup>
      </EuiModalFooter>
    </Fragment>
  );
};
