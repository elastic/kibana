import React from 'react';

import {
  KuiForm,
  KuiCheckbox,
  KuiFieldNumber,
  KuiRange,
  KuiFormRow,
  KuiSwitch,
  KuiFieldText,
  KuiTextArea,
} from '../../../../components';

// Don't use this, make proper ids instead. This is just for the example.
function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default () => {
  // Checkboxes are passed as an array of objects. They can be optionally checked to start.
  const checkboxOptions = [
    { id: makeId(), label: 'Option one' },
    { id: makeId(), label: 'Option two is checked by default', checked: true },
    { id: makeId(), label: 'Option three' },
  ];

  return (
    <KuiForm>
      <KuiFormRow
        id={makeId()}
        label="Number field"
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
        label="Text field"
        helpText="I am some friendly help text."
      >
        <KuiFieldText name="first" />
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
        label="Text area"
        id={makeId()}
      >
        <KuiTextArea name="textarea"/>
      </KuiFormRow>

      <KuiFormRow
        label="Use a switch instead of a single checkbox"
      >
        <KuiSwitch
          name="switch"
          id={makeId()}
          label="Should we do this?"
        />
      </KuiFormRow>

      <KuiFormRow
        id={makeId()}
        label="Checkboxes"
      >
        <KuiCheckbox options={checkboxOptions} />
      </KuiFormRow>
    </KuiForm>
  );
};
