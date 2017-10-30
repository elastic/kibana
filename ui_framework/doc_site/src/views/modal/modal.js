import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiModal,
  KuiModalBody,
  KuiModalFooter,
  KuiModalHeader,
  KuiModalHeaderTitle,
  KuiModalOverlay,
} from '../../../../components';

export class ModalExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  };

  showModal = () => {
    this.setState({ isModalVisible: true });
  };

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <KuiModalOverlay>
          <KuiModal
            onClose={this.closeModal}
            style={{ width: '800px' }}
          >
            <KuiModalHeader>
              <KuiModalHeaderTitle >
                Modal
              </KuiModalHeaderTitle>
            </KuiModalHeader>

            <KuiModalBody>
              <p className="kuiText">
                You can put anything you want in here!
              </p>
            </KuiModalBody>

            <KuiModalFooter>
              <KuiButton
                buttonType="hollow"
                onClick={this.closeModal}
              >
                Cancel
              </KuiButton>

              <KuiButton
                buttonType="primary"
                onClick={this.closeModal}
              >
                Save
              </KuiButton>
            </KuiModalFooter>
          </KuiModal>
        </KuiModalOverlay>
      );
    }
    return (
      <div>
        <KuiButton onClick={this.showModal}>
          Show Modal
        </KuiButton>

        {modal}
      </div>
    );
  }
}
