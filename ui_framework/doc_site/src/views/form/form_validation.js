import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiForm,
  KuiCheckbox,
  KuiFormRow,
  KuiFieldText,
} from '../../../../components';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showErrors: false,
    };
  }

  onButtonClick() {
    this.setState({
      showErrors: !this.state.showErrors,
    });
  }

  render() {
    const button = (
      <KuiButton fill type="danger" onClick={this.onButtonClick.bind(this)}>
        Toggle errors
      </KuiButton>
    );

    const checkboxOptions = [
      { id: makeId(), label: 'Option one' },
      { id: makeId(), label: 'Option two' },
      { id: makeId(), label: 'Option three' },
    ];

    let errors = null;
    if (this.state.showErrors) {
      errors = ['Here\'s an example of an error', 'You might have more than one error, so pass an array.'];
    } else {
      errors = null;
    }


    return (
      <div>
        <KuiForm invalid={this.state.showErrors} errors={errors}>
          <KuiFormRow
            id={makeId()}
            label="Validation only"
            invalid={this.state.showErrors}
          >
            <KuiFieldText name="first" />
          </KuiFormRow>
          <KuiFormRow
            id={makeId()}
            label="Validation with helptext and errors"
            helpText="I am some friendly help text."
            invalid={this.state.showErrors}
            errors={errors}
          >
            <KuiFieldText name="first" />
          </KuiFormRow>
          <KuiFormRow
            label="Non text field works the same"
            invalid={this.state.showErrors}
          >
            <KuiCheckbox options={checkboxOptions} />
          </KuiFormRow>
          {button}
        </KuiForm>
      </div>
    );
  }
}

