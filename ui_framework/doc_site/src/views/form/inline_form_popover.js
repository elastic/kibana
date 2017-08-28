import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiPopover,
  KuiForm,
  KuiFormRow,
  KuiFieldText,
  KuiFlexGroup,
  KuiFlexItem,
  KuiFieldNumber,

} from '../../../../components';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

const idPrefix = makeId();

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      isSwitchChecked: true,
    };
  }

  onSwitchChange = () => {
    this.setState({
      isSwitchChecked: !this.state.isSwitchChecked,
    });
  }

  onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const button = (
      <KuiButton
        iconSide="right"
        fill
        iconType="arrowDown"
        onClick={this.onButtonClick}
      >
        Form in a popover
      </KuiButton>
    );

    const formSample = (
      <KuiForm>
        <KuiFlexGroup>
          <KuiFlexItem grow={false} style={{ width: 100 }}>
            <KuiFormRow label="Age"  id={idPrefix}>
              <KuiFieldNumber max={10} placeholder={42} />
            </KuiFormRow>
          </KuiFlexItem>
          <KuiFlexItem>
            <KuiFormRow label="Full name" id={idPrefix}>
              <KuiFieldText icon="user" placeholder="John Doe" />
            </KuiFormRow>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiFormRow hasEmptyLabelSpace>
              <KuiButton>Save</KuiButton>
            </KuiFormRow>
          </KuiFlexItem>
        </KuiFlexGroup>
      </KuiForm>
    );

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
      >
        <div style={{ width: 500, padding: 16 }}>
          {formSample}
        </div>
      </KuiPopover>
    );
  }
}
