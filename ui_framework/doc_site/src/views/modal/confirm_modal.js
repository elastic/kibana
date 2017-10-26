import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiConfirmModal,
  KuiModalOverlay,
  KUI_MODAL_CONFIRM_BUTTON,
} from '../../../../components';

export class ConfirmModalExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };

    this.closeModal = this.closeModal.bind(this);
    this.showModal = this.showModal.bind(this);
  }

  closeModal() {
    this.setState({ isModalVisible: false });
  }

  showModal() {
    this.setState({ isModalVisible: true });
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <KuiModalOverlay>
          <KuiConfirmModal
            title="Do this thing"
            onCancel={this.closeModal}
            onConfirm={this.closeModal}
            cancelButtonText="No, don't do it"
            confirmButtonText="Yes, do it"
            defaultFocusedButton={KUI_MODAL_CONFIRM_BUTTON}
          >
            <p className="kuiText">You&rsquo;re about to do something.</p>
            <p className="kuiText">Are you sure you want to do this?</p>
          </KuiConfirmModal>
        </KuiModalOverlay>
      );
    }

    return (
      <div>
        <KuiButton onClick={this.showModal}>
          Show ConfirmModal
        </KuiButton>

        {modal}
      </div>
    );
  }
}
