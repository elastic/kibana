import React from 'react';
import PropTypes from 'prop-types';

import { KuiModal } from './modal';
import { KuiModalFooter } from './modal_footer';
import { KuiModalHeader } from './modal_header';
import { KuiModalHeaderTitle } from './modal_header_title';
import { KuiModalBody } from './modal_body';
import { KuiModalBodyText } from './modal_body_text';
import { KuiButton } from '../index';

export const CONFIRM_BUTTON = 'confirm';
export const CANCEL_BUTTON = 'cancel';

export const CONFIRM_MODAL_BUTTONS = [
  CONFIRM_BUTTON,
  CANCEL_BUTTON,
];

export class KuiConfirmModal extends React.Component {
  constructor(props) {
    super(props);

    this.confirmButton;
    this.cancelButton;
  }

  componentDidMount() {
    switch (this.props.defaultFocusedButton) {
      case CANCEL_BUTTON:
        this.cancelButton.focus();
        break;
      default:
        this.confirmButton.focus();
        break;
    }
  }

  onKeyDown = (event) => {
    // Treat the 'esc' key as a cancel indicator.
    if (event.keyCode === 27) {
      this.props.onCancel();
    }
  };

  render() {
    const {
      message,
      title,
      onCancel,
      onConfirm,
      cancelButtonText,
      confirmButtonText,
      className,
      ...rest
    } = this.props;

    const ariaLabel = rest['aria-label'];
    const dataTestSubj = rest['data-test-subj'];
    return (
      <KuiModal
        style={{ 'width': '450px' }}
        data-tests-subj={ dataTestSubj }
        aria-label={ ariaLabel }
        className={ className }
        onKeyDown={ this.onKeyDown }
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
            ref={ (button) => { this.cancelButton = button; } }
            onClick={ onCancel }
          >
            {cancelButtonText}
          </KuiButton>
          <KuiButton
            type="primary"
            data-test-subj="confirmModalConfirmButton"
            ref={ (button) => { this.confirmButton = button; } }
            onClick={ onConfirm }
          >
            {confirmButtonText}
          </KuiButton>
        </KuiModalFooter>
      </KuiModal>
    );
  }
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
