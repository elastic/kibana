import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { KuiModal } from './modal';
import { KuiModalFooter } from './modal_footer';
import { KuiModalHeader } from './modal_header';
import { KuiModalHeaderTitle } from './modal_header_title';
import { KuiModalBody } from './modal_body';
import {
  KuiButton,
  KuiButtonEmpty,
  KuiText,
} from '../../components/';

export const CONFIRM_BUTTON = 'confirm';
export const CANCEL_BUTTON = 'cancel';

const CONFIRM_MODAL_BUTTONS = [
  CONFIRM_BUTTON,
  CANCEL_BUTTON,
];

export function KuiConfirmModal({
  children,
  title,
  onCancel,
  onConfirm,
  cancelButtonText,
  confirmButtonText,
  className,
  defaultFocusedButton,
  ...rest,
}) {
  const classes = classnames('kuiModal--confirmation', className);

  let modalTitle;

  if (title) {
    modalTitle = (
      <KuiModalHeader>
        <KuiModalHeaderTitle data-test-subj="confirmModalTitleText">
          {title}
        </KuiModalHeaderTitle>
      </KuiModalHeader>
    );
  }

  let message;

  if (typeof children === 'string') {
    message = <p>{children}</p>;
  } else {
    message = children;
  }

  return (
    <KuiModal
      className={classes}
      onClose={onCancel}
      {...rest}
    >
      {modalTitle}

      <KuiModalBody>
        <KuiText data-test-subj="confirmModalBodyText">
          {message}
        </KuiText>
      </KuiModalBody>

      <KuiModalFooter>
        <KuiButtonEmpty
          autoFocus={defaultFocusedButton === CANCEL_BUTTON}
          data-test-subj="confirmModalCancelButton"
          onClick={onCancel}
          size="small"
        >
          {cancelButtonText}
        </KuiButtonEmpty>

        <KuiButton
          autoFocus={defaultFocusedButton === CONFIRM_BUTTON}
          data-test-subj="confirmModalConfirmButton"
          onClick={onConfirm}
          size="small"
          fill
        >
          {confirmButtonText}
        </KuiButton>
      </KuiModalFooter>
    </KuiModal>
  );
}

KuiConfirmModal.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  cancelButtonText: PropTypes.string,
  confirmButtonText: PropTypes.string,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
  className: PropTypes.string,
  defaultFocusedButton: PropTypes.oneOf(CONFIRM_MODAL_BUTTONS)
};
