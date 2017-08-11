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


// Don't use this, make proper ids instead. This is just for the example.
function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default class extends Component {

  render() {

    // Checkboxes are passed as an array of objects. They can be optionally checked to start.
    const checkboxOptions = [
      { id: makeId(), label: 'Option one' },
      { id: makeId(), label: 'Option two is checked by default', checked: true },
      { id: makeId(), label: 'Option three' },
    ];

    // Select options are passed as an array of objects.
    const selectOptions = [
      { value: 'option_one', text: 'Option one' },
      { value: 'option_two', text: 'Option two' },
      { value: 'option_three', text: 'Option three' },
    ];


    const formSample = (
      <KuiForm>

        <KuiFormRow
          id={makeId()}
          label="Number"
          helpText="Any number between 1 and 5"
        >
          <KuiFieldNumber
            name="number"
            min={1}
            max={5}
          />
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
          <KuiFieldText
            name="first"
            placeholder="Some placeholder text"
          />
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
          <KuiRange
            min={0}
            max={100}
            name="range"
            id="range"
          />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Search"
          icon="search"
        >
          <KuiFieldSearch
            label="Search"
            name="search1"
            placeholder="Search..."
          />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Select dropdown"
          icon="arrowDown"
          containsSelect
        >
          <KuiSelect
            options={selectOptions}
            name="dropdown"
          />
        </KuiFormRow>
        <KuiFormRow
          label="Textarea"
          id={makeId()}
        >
          <KuiTextArea name="textarea"/>
        </KuiFormRow>

        <KuiFormRow
          label="Use a swich if you only need one checkbox"
        >
          <KuiSwitch
            name="switch"
            id={makeId()}
            label="Should we do this?"
          />
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
