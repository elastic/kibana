import React from 'react';
import PropTypes from 'prop-types';

import { KuiModal } from './modal';
import { KuiModalFooter } from './modal_footer';
import { KuiModalHeader } from './modal_header';
import { KuiModalHeaderTitle } from './modal_header_title';
import { KuiModalBody } from './modal_body';
import { KuiModalBodyText } from './modal_body_text';
import { KuiButton } from '../index';
import { ESC_KEY_CODE } from '../../services';

export const CONFIRM_BUTTON = 'confirm';
export const CANCEL_BUTTON = 'cancel';

const CONFIRM_MODAL_BUTTONS = [
  CONFIRM_BUTTON,
  CANCEL_BUTTON,
];

export function KuiConfirmModal({
    message,
    title,
    onCancel,
    onConfirm,
    cancelButtonText,
    confirmButtonText,
    className,
    defaultFocusedButton,
    ...rest,
  }) {

  const onKeyDown = (event) => {
    // Treat the 'esc' key as a cancel indicator.
    if (event.keyCode === ESC_KEY_CODE) {
      onCancel();
    }
  };

  const ariaLabel = rest['aria-label'];
  const dataTestSubj = rest['data-test-subj'];
  return (
    <KuiModal
      style={{ 'width': '450px' }}
      data-tests-subj={ dataTestSubj }
      aria-label={ ariaLabel }
      className={ className }
      onKeyDown={ onKeyDown }
    >
      {
        title ?
          <KuiModalHeader>
            <KuiModalHeaderTitle data-test-subj="confirmModalTitleText">
              { title }
            </KuiModalHeaderTitle>
          </KuiModalHeader>
          : null
      }
      <KuiModalBody>
        <KuiModalBodyText data-test-subj="confirmModalBodyText">
          { message }
        </KuiModalBodyText>
      </KuiModalBody>

      <KuiModalFooter>
        <KuiButton
          buttonType="hollow"
          autoFocus={ defaultFocusedButton === CANCEL_BUTTON }
          data-test-subj="confirmModalCancelButton"
          onClick={ onCancel }
        >
          {cancelButtonText}
        </KuiButton>
        <KuiButton
          buttonType="primary"
          autoFocus={ defaultFocusedButton === CONFIRM_BUTTON }
          data-test-subj="confirmModalConfirmButton"
          onClick={ onConfirm }
        >
          {confirmButtonText}
        </KuiButton>
      </KuiModalFooter>
    </KuiModal>
  );
}

KuiConfirmModal.propTypes = {
  message: PropTypes.string,
  title: PropTypes.string,
  cancelButtonText: PropTypes.string,
  confirmButtonText: PropTypes.string,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
  dataTestSubj: PropTypes.string,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
  defaultFocusedButton: PropTypes.oneOf(CONFIRM_MODAL_BUTTONS)
};
