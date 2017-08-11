import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiPopover,
  KuiForm,
  KuiCheckbox,
  KuiFieldNumber,
  KuiFieldPassword,
  KuiRange,
  KuiFormRow,
  KuiFieldSearch,
  KuiSelect,
  KuiSwitch,
  KuiFieldText,
  KuiTextArea,
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
          <KuiFieldNumber name="number" id="number" min={1} max={5} />
        </KuiFormRow>
        <KuiFormRow
          id="first"
          label="First name"
          helpText="I am some friendly help text."
        >
          <KuiFieldText id="first" name="first" />
        </KuiFormRow>
        <KuiFormRow
          id="last"
          label="Last name with icon"
          icon="user"
        >
          <KuiFieldText id="last" name="first" placeholder="Some placeholder text" />
        </KuiFormRow>
        <KuiFormRow
          id="pass"
          label="Password"
          icon="lock"
        >
          <KuiFieldPassword name="pass" id="pass" />
        </KuiFormRow>
        <KuiFormRow
          id="range"
          label="Range"
        >
          <KuiRange min={0} max={100} name="range" id="range" />
        </KuiFormRow>
        <KuiFormRow
          id="search1"
          label="Search"
          icon="search"
        >
          <KuiFieldSearch label="Search" id="search1" name="search1" placeholder="Search..." />
        </KuiFormRow>
        <KuiFormRow
          id="dropdown"
          label="Select dropdown"
          icon="arrowDown"
          className="kuiFormRow--select"
        >
          <KuiSelect options={formOptions} label="Dropdown" name="dropdown" id="dropdown"/>
        </KuiFormRow>
        <KuiFormRow label="Textarea" id="textarea">
          <KuiTextArea id="textarea" name="textarea"/>
        </KuiFormRow>
        <KuiFormRow>
          <KuiSwitch id="switch" name="switch" label="Should we do this?"/>
        </KuiFormRow>
        <KuiFormRow label="You should always use more than one checkbox">
          <KuiCheckbox options={formOptions} />
        </KuiFormRow>
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
