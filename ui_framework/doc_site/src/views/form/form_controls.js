import React, {
  Component,
} from 'react';

import {
  KuiCheckboxGroup,
  KuiFieldNumber,
  KuiFieldPassword,
  KuiFieldSearch,
  KuiFieldText,
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
      <div>
        <KuiFieldText placeholder="Placeholder text" />

        <br />
        <br />

        <KuiFieldText
          defaultValue="Text field with customizable icon"
          icon="user"
        />

        <br />
        <br />

        <KuiFieldNumber defaultValue="23" />

        <br />
        <br />

        <KuiFieldNumber
          defaultValue="23"
          icon="user"
        />

        <br />
        <br />

        <KuiFieldPassword defaultValue="password" />

        <br />
        <br />

        <KuiFieldSearch defaultValue="Search field" />

        <br />
        <br />

        <KuiTextArea />

        <br />
        <br />

        <KuiSelect
          options={[
            { value: 'option_one', text: 'Option one' },
            { value: 'option_two', text: 'Option two' },
            { value: 'option_three', text: 'Option three' },
          ]}
        />

        <br />
        <br />

        <KuiRange />

        <br />
        <br />

        <KuiSwitch
          label="Switch control"
          checked={this.state.isSwitchChecked}
          onChange={this.onSwitchChange}
        />

        <br />
        <br />

        <KuiCheckboxGroup
          options={this.state.checkboxes}
          idToSelectedMap={this.state.checkboxIdToSelectedMap}
          onChange={this.onCheckboxChange}
        />
      </div>
    );
  }
}
