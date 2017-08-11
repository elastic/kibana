import React, {
  Component,
} from 'react';

import {
  KuiFormRow,
  KuiFieldText,
} from '../../../../components';

// Don't use this, make proper ids instead. This is just for the example.
function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default class extends Component {

  render() {
    return (
      <div>
        <KuiFieldText name="naked_text" placeholder="Naked component with placeholder" />

        <br/><br/>

        <KuiFormRow
          id={makeId()}
          label="Text field in a form row"
        >
          <KuiFieldText name="text_name_in_row" />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Icons should only be used on field level components"
          icon="user"
        >
          <KuiFieldText name="text_name_in_row_with_icon" />
        </KuiFormRow>

        <KuiFormRow
          id={makeId()}
          label="Text field with helptext"
          helpText="I'm some help text!"
        >
          <KuiFieldText name="text_name_in_row_with_help" />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="Text field is invalid"
          invalid
        >
          <KuiFieldText name="text_name_in_row_is_invalid" />
        </KuiFormRow>
        <KuiFormRow
          id={makeId()}
          label="Text field is invalid with errors"
          invalid
          errors={['Hello, I\'m some local error text passed as an array']}
        >
          <KuiFieldText name="text_name_in_row_has_errors" />
        </KuiFormRow>
      </div>
    );
  }
}

