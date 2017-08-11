import React, {
  Component,
} from 'react';

import {
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


function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default class extends Component {

  render() {

    const checkboxOptions = [
      { id: makeId(), label: 'Option one' },
      { id: makeId(), label: 'Option two' },
      { id: makeId(), label: 'Option three' },
    ];

    const selectOptions = ['Option one', 'Option two', 'Option three'];

    const formSample = (
      <KuiForm>
        <KuiFormRow
          id={makeId()}
          label="Number"
          helpText="Any number between 1 and 5"
        >
          <KuiFieldNumber name="number" min={1} max={5} />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="First name"
          helpText="I am some friendly help text."
        >
          <KuiFieldText name="first" />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="Last name with icon"
          icon="user"
        >
          <KuiFieldText name="first" placeholder="Some placeholder text" />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="Password"
          icon="lock"
        >
          <KuiFieldPassword name="pass" />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="Range"
        >
          <KuiRange min={0} max={100} name="range" id="range" />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="Search"
          icon="search"
        >
          <KuiFieldSearch label="Search" name="search1" placeholder="Search..." />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="Select dropdown"
          icon="arrowDown"
          className="kuiFormRow--select"
        >
          <KuiSelect options={selectOptions} name="dropdown" />
        </KuiFormRow>
        <KuiFormRow
          label="Textarea"
          id={makeId()}
        >
          <KuiTextArea name="textarea"/>
        </KuiFormRow>
        <KuiFormRow>
          <KuiSwitch name="switch" id={makeId()} label="Should we do this?"/>
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="You should always use more than one checkbox"
        >
          <KuiCheckbox options={checkboxOptions} />
        </KuiFormRow>
      </KuiForm>
    );

    return (
      <div>
        {formSample}
      </div>
    );
  }
}
