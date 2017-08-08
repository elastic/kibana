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

    const selectOptions = ['Option one', 'Option two', 'Option three'];

    const formSample = (
      <KuiForm>
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
          <KuiFormSelect options={selectOptions} label="Dropdown" id="dropdown"/>
        </KuiFormRow>
        <KuiFormRow label="Textarea">
          <KuiFormTextarea />
        </KuiFormRow>
        <KuiFormSwitch id="switch"/>
        <KuiFormRow label="You should always use more than one checkbox">
          <KuiFormCheckbox label="Option one" id="checkbox1" />
          <KuiFormCheckbox label="Another option" id="checkbox2" />
          <KuiFormCheckbox label="Yet another useful option" id="checkbox3" />
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
