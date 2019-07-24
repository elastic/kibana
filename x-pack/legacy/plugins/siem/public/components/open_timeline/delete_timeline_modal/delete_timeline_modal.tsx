/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { pure } from 'recompose';
import * as React from 'react';

import * as i18n from '../translations';

interface Props {
  title?: string | null;
  onDelete: () => void;
  toggleShowModal: () => void;
}

export const DELETE_TIMELINE_MODAL_WIDTH = 600; // px

/**
 * Renders a modal that confirms deletion of a timeline
 */
export const DeleteTimelineModal = pure<Props>(({ title, toggleShowModal, onDelete }) => (
  <EuiConfirmModal
    title={
      <FormattedMessage
        id="xpack.siem.open.timeline.deleteTimelineModalTitle"
        data-test-subj="title"
        defaultMessage="Delete `{title}`?"
        values={{
          title: title != null && title.trim().length > 0 ? title.trim() : i18n.UNTITLED_TIMELINE,
        }}
      />
    }
    onCancel={toggleShowModal}
    onConfirm={onDelete}
    cancelButtonText={i18n.CANCEL}
    confirmButtonText={i18n.DELETE}
    buttonColor="danger"
    defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
  >
    <div data-test-subj="warning">{i18n.DELETE_WARNING}</div>
  </EuiConfirmModal>
));
