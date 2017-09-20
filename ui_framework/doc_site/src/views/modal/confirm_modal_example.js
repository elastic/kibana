import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiConfirmModal,
  KuiModalOverlay,
} from '../../../../components';

export class ConfirmModalExample extends Component {
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
        <KuiButton onClick={this.showModal}>
          Click me to load a modal
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
