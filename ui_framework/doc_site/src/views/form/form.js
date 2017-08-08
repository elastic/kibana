import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiPopover,
  KuiForm,
  KuiFormCheckbox,
  KuiFormRadio,
  KuiFormRow,
  KuiFormSearch,
  KuiFormSelect,
  KuiFormSwitch,
  KuiFormText,
  KuiFormTextarea,
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
        <KuiFormText label="First name" id="first" helpText="I am some friendly help text."/>
        <KuiFormText label="Last name with icon" id="last" icon="user" placeholder="Some placeholder text" />
        <KuiFormCheckbox/>
        <KuiFormRadio />
        <KuiFormSearch label="Search" id="blargh" placeholder="Search..." />
        <KuiFormSelect label="Dropdown" id="dropdown"/>
        <KuiFormSwitch id="switch"/>
        <KuiFormTextarea />
      </KuiForm>
    );

    return (
      <div>
        {formSample}
        <br/>
        <br/>
        <br/>
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
