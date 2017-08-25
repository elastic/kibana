import React, {
  Component,
} from 'react';

import {
  KuiCheckboxGroup,
  KuiFieldNumber,
  KuiFieldPassword,
  KuiFieldSearch,
  KuiFieldText,
  KuiForm,
  KuiFormRow,
  KuiRange,
  KuiSelect,
  KuiSwitch,
  KuiTextArea,
} from '../../../../components';

// Don't use this, make proper ids instead. This is just for the example.
function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default class extends Component {
  constructor(props) {
    super(props);

    const idPrefix = makeId();

    this.state = {
      isSwitchChecked: false,
      checkboxes: [{
        id: `${idPrefix}0`,
        label: 'Option one',
      }, {
        id: `${idPrefix}1`,
        label: 'Option two is checked by default',
      }, {
        id: `${idPrefix}2`,
        label: 'Option three',
      }],
      checkboxIdToSelectedMap: {
        [`${idPrefix}1`]: true,
      },
    };
  }

  onSwitchChange = () => {
    this.setState({
      isSwitchChecked: !this.state.isSwitchChecked,
    });
  }

  onCheckboxChange = optionId => {
    const newCheckboxIdToSelectedMap = Object.assign({}, this.state.checkboxIdToSelectedMap, {
      [optionId]: !this.state.checkboxIdToSelectedMap[optionId],
    });

    this.setState({
      checkboxIdToSelectedMap: newCheckboxIdToSelectedMap,
    });
  }

  render() {
    return (
      <KuiForm>
        <KuiFormRow
          id={makeId()}
          label="Text field"
          helpText="I am some friendly help text."
        >
          <KuiFieldText name="first" />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Text field with icon"
        >
          <KuiFieldText
            defaultValue="Text field with customizable icon"
            icon="user"
          />
        </KuiFormRow>

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
          label="Password"
        >
          <KuiFieldPassword defaultValue="password" />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Search"
        >
          <KuiFieldSearch />
        </KuiFormRow>

        <KuiFormRow
          label="Text area"
          id={makeId()}
        >
          <KuiTextArea name="textarea"/>
        </KuiFormRow>

        <KuiFormRow
          label="Select"
          id={makeId()}
        >
          <KuiSelect
            options={[
              { value: 'option_one', text: 'Option one' },
              { value: 'option_two', text: 'Option two' },
              { value: 'option_three', text: 'Option three' },
            ]}
          />
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
          label="Use a switch instead of a single checkbox"
        >
          <KuiSwitch
            name="switch"
            id={makeId()}
            label="Should we do this?"
            checked={this.state.isSwitchChecked}
            onChange={this.onSwitchChange}
          />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Checkboxes"
        >
          <KuiCheckboxGroup
            options={this.state.checkboxes}
            idToSelectedMap={this.state.checkboxIdToSelectedMap}
            onChange={this.onCheckboxChange}
          />
        </KuiFormRow>
      </KuiForm>
    );
  }
}
