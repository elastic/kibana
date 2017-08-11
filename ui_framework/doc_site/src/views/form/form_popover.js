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

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick() {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const button = (
      <KuiButton iconReverse fill iconType="arrowDown" onClick={this.onButtonClick.bind(this)}>
        Form in a popover
      </KuiButton>
    );

    const formSample = (
      <KuiForm>
        <KuiFormRow>
          <KuiSwitch id="popswitch" name="popswitch" label="Isn't this popover form cool?"/>
        </KuiFormRow>
        <KuiFormRow
          id="popfirst"
          label="A text field"
        >
          <KuiFieldText id="popfirst" name="popfirst" />
        </KuiFormRow>
        <KuiFormRow
          id="poprange"
          label="Range"
          helpText="Some help text for the range"
        >
          <KuiRange min={0} max={100} name="poprange" id="poprange" />
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
          <div style={{ width: '300px' }}>{formSample}</div>
        </KuiPopover>
      </div>
    );
  }
}
