import React from 'react';
import PropTypes from 'prop-types';

import { KuiModal } from './modal';
import { KuiModalFooter } from './modal_footer';
import { KuiModalHeader } from './modal_header';
import { KuiModalHeaderTitle } from './modal_header_title';
import { KuiModalBody } from './modal_body';
import { KuiModalBodyText } from './modal_body_text';
import { KuiButton } from '../index';

export function KuiConfirmModal({
    message,
    title,
    onCancel,
    onConfirm,
    cancelButtonText,
    confirmButtonText,
    className,
    ...rest }) {
  const ariaLabel = rest['aria-label'];
  const dataTestSubj = rest['data-test-subj'];
  return (
    <KuiModal
      style={{ 'width': '450px' }}
      data-tests-subj={ dataTestSubj }
      aria-label={ ariaLabel }
      className={ className }
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
          type="hollow"
          data-test-subj="confirmModalCancelButton"
          onClick={ onCancel }
        >
          {cancelButtonText}
        </KuiButton>
        <KuiButton
          type="primary"
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
};
