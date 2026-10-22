/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  RelatedRemovalChoice,
  RelatedRemovalOptions,
} from '../../client/attachment_framework/types';
import { CANCEL_BUTTON } from './property_actions/translations';
import { useFocusButtonTrap } from '../use_focus_button';

export const REMOVE_WITH_RELATED_MODAL_TEST_ID = 'remove-with-related-modal';
const REMOVE_WITH_RELATED_BUTTON_TEST_ID = `${REMOVE_WITH_RELATED_MODAL_TEST_ID}-remove-with-related`;

interface Props {
  title: string;
  relatedRemoval: RelatedRemovalChoice;
  onConfirm: (options: RelatedRemovalOptions) => void;
  onCancel: () => void;
  /**
   * The ref of the button to focus when the modal is closed
   */
  focusButtonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
}

/** Confirms a removal that can also take related attachments, letting the user keep them. */
const RemoveWithRelatedConfirmationModalComponent: React.FC<Props> = ({
  title,
  relatedRemoval: { description, removeOnlyLabel, removeWithRelatedLabel },
  onConfirm,
  onCancel,
  focusButtonRef,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const focusTrapProps = useFocusButtonTrap(focusButtonRef);

  const onRemoveOnly = useCallback(() => onConfirm({ includeRelated: false }), [onConfirm]);
  const onRemoveWithRelated = useCallback(() => onConfirm({ includeRelated: true }), [onConfirm]);

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      data-test-subj={REMOVE_WITH_RELATED_MODAL_TEST_ID}
      onClose={onCancel}
      focusTrapProps={focusTrapProps}
      initialFocus={`[data-test-subj="${REMOVE_WITH_RELATED_BUTTON_TEST_ID}"]`}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <p data-test-subj={`${REMOVE_WITH_RELATED_MODAL_TEST_ID}-description`}>{description}</p>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`${REMOVE_WITH_RELATED_MODAL_TEST_ID}-cancel`}
              flush="left"
              onClick={onCancel}
            >
              {CANCEL_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj={`${REMOVE_WITH_RELATED_MODAL_TEST_ID}-remove-only`}
                  color="danger"
                  onClick={onRemoveOnly}
                >
                  {removeOnlyLabel}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj={REMOVE_WITH_RELATED_BUTTON_TEST_ID}
                  color="danger"
                  fill
                  onClick={onRemoveWithRelated}
                >
                  {removeWithRelatedLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

RemoveWithRelatedConfirmationModalComponent.displayName = 'RemoveWithRelatedConfirmationModal';

export const RemoveWithRelatedConfirmationModal = React.memo(
  RemoveWithRelatedConfirmationModalComponent
);
