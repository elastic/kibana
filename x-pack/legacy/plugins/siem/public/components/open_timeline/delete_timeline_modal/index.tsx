/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiModal, EuiOverlayMask, EuiIcon, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { DeleteTimelineModal, DELETE_TIMELINE_MODAL_WIDTH } from './delete_timeline_modal';
import * as i18n from '../translations';
import { DeleteTimelines } from '../types';
const RemovePopover = createGlobalStyle`
div.euiPopover__panel-isOpen {
  display: none;
}
`;
export const TimelineCustomAction = styled(EuiLink)`
  width: 100%;
`;
export const ActionListIcon = styled(EuiIcon)`
  margin-right: 8px;
`;
interface Props {
  deleteTimelines: DeleteTimelines;
  isModalOpen: boolean;
  closeModal: () => void;
  savedObjectIds?: string[] | null | undefined;
  title: string | JSX.Element | null;
  onComplete?: () => void;
}
/**
 * Renders a button that when clicked, displays the `Delete Timeline` modal
 */
export const DeleteTimelineModalButton = React.memo<Props>(
  ({ closeModal, deleteTimelines, isModalOpen, savedObjectIds, title, onComplete }) => {
    const internalCloseModal = useCallback(() => {
      closeModal();
      if (onComplete != null) {
        onComplete();
      }
    }, [closeModal, onComplete]);
    const onDelete = useCallback(() => {
      if (deleteTimelines != null && savedObjectIds != null) {
        deleteTimelines(savedObjectIds);
      }
      closeModal();
      if (onComplete != null) onComplete();
    }, [closeModal, deleteTimelines, savedObjectIds]);
    return (
      <>
        {isModalOpen && <RemovePopover />}
        {isModalOpen ? (
          <EuiOverlayMask>
            <EuiModal maxWidth={DELETE_TIMELINE_MODAL_WIDTH} onClose={closeModal}>
              <DeleteTimelineModal
                data-test-subj="delete-timeline-modal"
                onDelete={onDelete}
                title={title}
                closeModal={internalCloseModal}
              />
            </EuiModal>
          </EuiOverlayMask>
        ) : null}
      </>
    );
  }
);
DeleteTimelineModalButton.displayName = 'DeleteTimelineModalButton';
