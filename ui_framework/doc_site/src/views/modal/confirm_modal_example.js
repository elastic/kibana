import React from 'react';

import {
  KuiConfirmModal,
  KuiModalOverlay,
  KuiButton
} from '../../../../components/index';

export class ConfirmModalExample extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showConfirmModal: false
    };
    this.closeModal = this.closeModal.bind(this);
    this.showModal = this.showModal.bind(this);
  }

  closeModal() {
    this.setState({ showConfirmModal: false });
  }

  showModal() {
    this.setState({ showConfirmModal: true });
  }

  render() {
    return (
      <div>
        <KuiButton buttonType="primary" onClick={this.showModal}>
          Show Modal
        </KuiButton>
        {
          this.state.showConfirmModal ?
            <KuiModalOverlay>
              <KuiConfirmModal
                message="This is a confirmation modal example"
                title="A confirmation modal"
                onCancel={this.closeModal}
                onConfirm={this.closeModal}
                cancelButtonText="Cancel"
                confirmButtonText="Confirm"
              />
            </KuiModalOverlay>
            : null
        }
      </div>
    );
  }
}
