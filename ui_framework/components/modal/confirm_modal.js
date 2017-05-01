import React from 'react';

import { KuiModal } from '../modal';
import { KuiModalFooter } from './modal_footer';
import { KuiModalHeader } from './modal_header';
import { KuiModalBody } from './modal_body';
import { KuiModalBodyText } from './modal_body_text';
import { KuiButton } from '../index';

export function KuiConfirmModal({ message, title, onCancel, onConfirm, cancelButtonText, confirmButtonText, ...rest }) {
  return (
    <KuiModal style={{ 'width': '450px' }} { ...rest }>
      {
        title ?
          <KuiModalHeader>
            <div className="kuiModalHeader__title" data-test-subj="confirmModalTitleText">
              { title }
            </div>
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
  message: React.PropTypes.string,
  title: React.PropTypes.string,
  cancelButtonText: React.PropTypes.string,
  confirmButtonText: React.PropTypes.string,
  onCancel: React.PropTypes.func,
  onConfirm: React.PropTypes.func,
};
