import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiPopover,
  KuiForm,
  KuiFormCheckbox,
  KuiFormNumber,
  KuiFormPassword,
  KuiFormRadio,
  KuiFormRange,
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

    const formOptions = ['Option one', 'Option two', 'Option three'];

    const formSample = (
      <KuiForm>
        <KuiFormRow
          id="first"
          label="Number"
          helpText="Any number between 1 and 5"
        >
          <KuiFormNumber id="number" min={1} max={5} />
        </KuiFormRow>
        <KuiFormRow
          id="first"
          label="First name"
          helpText="I am some friendly help text."
        >
          <KuiFormText id="first" />
        </KuiFormRow>
        <KuiFormRow
          id="last"
          label="Last name with icon"
          icon="user"
        >
          <KuiFormText id="last" placeholder="Some placeholder text" />
        </KuiFormRow>
        <KuiFormRow
          id="pass"
          label="Password"
          icon="lock"
        >
          <KuiFormPassword />
        </KuiFormRow>
        <KuiFormRow
          id="range"
          label="Range"
        >
          <KuiFormRange min={0} max={100} />
        </KuiFormRow>
        <KuiFormRow
          id="search1"
          label="Search"
          icon="search"
        >
          <KuiFormSearch label="Search" id="search1" placeholder="Search..." />
        </KuiFormRow>
        <KuiFormRow
          id="dropdown"
          label="Select dropdown"
          icon="arrowDown"
          className="kuiFormRow--select"
        >
          <KuiFormSelect options={formOptions} label="Dropdown" id="dropdown"/>
        </KuiFormRow>
        <KuiFormRow label="Textarea">
          <KuiFormTextarea />
        </KuiFormRow>
        <KuiFormSwitch id="switch"/>
        <KuiFormRow label="You should always use more than one checkbox">
          <KuiFormCheckbox options={formOptions} />
        </KuiFormRow>
        <KuiFormRadio />
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
