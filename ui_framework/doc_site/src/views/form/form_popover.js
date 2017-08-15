import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiPopover,
  KuiForm,
  KuiRange,
  KuiFormRow,
  KuiSwitch,
  KuiFieldText,
} from '../../../../components';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

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
        <KuiFormRow>
          <KuiSwitch
            id={makeId()}
            name="popswitch"
            label="Isn't this popover form cool?"
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

    return (
      <div>
        <KuiPopover
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover.bind(this)}
        >
          <div style={{ width: '300px' }}>
            {formSample}
          </div>
        </KuiPopover>
      </div>
    );
  }
}
