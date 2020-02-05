/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiModal, EuiToolTip, EuiOverlayMask } from '@elastic/eui';
import React, { useState } from 'react';

import { DeleteTimelineModal, DELETE_TIMELINE_MODAL_WIDTH } from './delete_timeline_modal';
import * as i18n from '../translations';
import { DeleteTimelines } from '../types';

interface Props {
  deleteTimelines?: DeleteTimelines;
  savedObjectId?: string | null;
  title?: string | null;
}
/**
 * Renders a button that when clicked, displays the `Delete Timeline` modal
 */
export const DeleteTimelineModalButton = React.memo<Props>(
  ({ deleteTimelines, savedObjectId, title }) => {
    const [showModal, setShowModal] = useState(false);

    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);

    const onDelete = () => {
      if (deleteTimelines != null && savedObjectId != null) {
        deleteTimelines([savedObjectId]);
      }
      closeModal();
    };

    return (
      <>
        <EuiToolTip content={i18n.DELETE}>
          <EuiButtonIcon
            aria-label={i18n.DELETE}
            color="danger"
            data-test-subj="delete-timeline"
            iconSize="s"
            iconType="trash"
            isDisabled={deleteTimelines == null || savedObjectId == null || savedObjectId === ''}
            onClick={openModal}
            size="s"
          />
        </EuiToolTip>

        {showModal ? (
          <EuiOverlayMask>
            <EuiModal maxWidth={DELETE_TIMELINE_MODAL_WIDTH} onClose={closeModal}>
              <DeleteTimelineModal
                data-test-subj="delete-timeline-modal"
                onDelete={onDelete}
                title={title}
                closeModal={closeModal}
              />
            </EuiModal>
          </EuiOverlayMask>
        ) : null}
      </>
    );
  }
);

DeleteTimelineModalButton.displayName = 'DeleteTimelineModalButton';
