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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChipRow, CHIP_OTHER } from './chip_row';
import { CommentBox } from './comment_box';

const labels = {
  titleDown: i18n.translate('xpack.agentBuilder.feedbackModal.titleDown', {
    defaultMessage: 'What went wrong?',
  }),
  titleUp: i18n.translate('xpack.agentBuilder.feedbackModal.titleUp', {
    defaultMessage: 'What worked well?',
  }),
  submit: i18n.translate('xpack.agentBuilder.feedbackModal.submit', {
    defaultMessage: 'Submit',
  }),
  cancel: i18n.translate('xpack.agentBuilder.feedbackModal.cancel', {
    defaultMessage: 'Cancel',
  }),
};

interface FeedbackModalProps {
  vote: 'up' | 'down';
  chips: string[];
  comment: string;
  isSubmitting: boolean;
  onToggleChip: (chip: string) => void;
  onCommentChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  vote,
  chips,
  comment,
  isSubmitting,
  onToggleChip,
  onCommentChange,
  onSubmit,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onClose} maxWidth={480}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {vote === 'down' ? labels.titleDown : labels.titleUp}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <ChipRow vote={vote} selected={chips} onToggle={onToggleChip} />
        <EuiSpacer size="m" />
        <CommentBox
          value={comment}
          onChange={onCommentChange}
          shouldFocus={chips.includes(CHIP_OTHER)}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isSubmitting}>
          {labels.cancel}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
          onClick={onSubmit}
          data-test-subj="roundFeedbackSubmitButton"
        >
          {labels.submit}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
