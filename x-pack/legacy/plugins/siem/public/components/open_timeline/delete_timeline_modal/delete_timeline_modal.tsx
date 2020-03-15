/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useState } from 'react';

import * as i18n from '../translations';
import { OpenTimelineResult, SetActionTimeline } from '../types';

interface Props {
  title?: string | JSX.Element | null;
  onDelete: () => void;
  closeModal: () => void;
}

export const DELETE_TIMELINE_MODAL_WIDTH = 600; // px

const getDeletedTitles = (title: string | JSX.Element | null | undefined) => {
  if (title != null && React.isValidElement(title)) {
    return title;
  } else if (title != null && typeof title === 'string' && title.trim().length > 0) {
    return title.trim();
  }
  return i18n.UNTITLED_TIMELINE;
};

/**
 * Renders a modal that confirms deletion of a timeline
 */
export const DeleteTimelineModal = React.memo<Props>(({ title, closeModal, onDelete }) => (
  <EuiConfirmModal
    buttonColor="danger"
    cancelButtonText={i18n.CANCEL}
    confirmButtonText={i18n.DELETE}
    defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
    onCancel={closeModal}
    onConfirm={onDelete}
    title={
      <FormattedMessage
        id="xpack.siem.open.timeline.deleteTimelineModalTitle"
        data-test-subj="title"
        defaultMessage="Delete {title}?"
        values={{
          title: getDeletedTitles(title),
        }}
      />
    }
  >
    <div data-test-subj="warning">{i18n.DELETE_WARNING}</div>
  </EuiConfirmModal>
));

DeleteTimelineModal.displayName = 'DeleteTimelineModal';

export const useDeleteTimeline = ({
  setActionTimeline,
}: {
  setActionTimeline: SetActionTimeline;
}) => {
  const [isDeleteTimelineModalOpen, setIsDeleteTimelineModalOpen] = useState<boolean>(false);

  const onCloseDeleteTimelineModal = useCallback(() => {
    setIsDeleteTimelineModalOpen(false);
    setActionTimeline(undefined);
  }, [setIsDeleteTimelineModalOpen]);

  const onOpenDeleteTimelineModal = useCallback(
    (selectedActionItem?: OpenTimelineResult) => {
      setIsDeleteTimelineModalOpen(true);
      setActionTimeline(selectedActionItem);
    },
    [setIsDeleteTimelineModalOpen, setActionTimeline]
  );
  return {
    isDeleteTimelineModalOpen,
    setIsDeleteTimelineModalOpen,
    onCloseDeleteTimelineModal,
    onOpenDeleteTimelineModal,
  };
};
