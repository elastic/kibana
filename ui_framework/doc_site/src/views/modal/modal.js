import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiButtonEmpty,
  KuiFieldText,
  KuiForm,
  KuiFormRow,
  KuiModal,
  KuiModalBody,
  KuiModalFooter,
  KuiModalHeader,
  KuiModalHeaderTitle,
  KuiModalOverlay,
  KuiRange,
  KuiSwitch,
} from '../../../../components';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export class ModalExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
      isSwitchChecked: true,
    };

    this.closeModal = this.closeModal.bind(this);
    this.showModal = this.showModal.bind(this);
  }

  onSwitchChange = () => {
    this.setState({
      isSwitchChecked: !this.state.isSwitchChecked,
    });
  }

  closeModal() {
    this.setState({ isModalVisible: false });
  }

  showModal() {
    this.setState({ isModalVisible: true });
  }

  render() {
    const formSample = (
      <KuiForm>
        <KuiFormRow>
          <KuiSwitch
            id={makeId()}
            name="popswitch"
            label="Isn't this modal form cool?"
            checked={this.state.isSwitchChecked}
            onChange={this.onSwitchChange}
          />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="A text field"
        >
          <KuiFieldText name="popfirst" />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Range"
          helpText="Some help text for the range"
        >
          <KuiRange
            min={0}
            max={100}
            name="poprange"
          />
        </KuiFormRow>
      </KuiForm>
    );


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
                Form in a modal
              </KuiModalHeaderTitle>
            </KuiModalHeader>

            <KuiModalBody>
              {formSample}
            </KuiModalBody>

            <KuiModalFooter>
              <KuiButtonEmpty
                onClick={this.closeModal}
                size="small"
              >
                Cancel
              </KuiButtonEmpty>

              <KuiButton
                onClick={this.closeModal}
                size="small"
                fill
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
