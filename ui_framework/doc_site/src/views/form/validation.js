import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiForm,
  KuiSelect,
  KuiFormRow,
  KuiTextArea,
  KuiFieldText,
} from '../../../../components';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showErrors: true,
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

    let errors;

    if (this.state.showErrors) {
      errors = [
        'Here\'s an example of an error',
        'You might have more than one error, so pass an array.',
      ];
    }

    return (
      <div>
        <KuiForm
          isInvalid={this.state.showErrors}
          error={errors}
        >
          <KuiFormRow
            id={makeId()}
            label="Validation only"
            isInvalid={this.state.showErrors}
          >
            <KuiFieldText
              name="first"
              isInvalid={this.state.showErrors}
            />
          </KuiFormRow>

          <KuiFormRow
            id={makeId()}
            label="Validation with help text and errors"
            helpText="I am some friendly help text."
            isInvalid={this.state.showErrors}
            error={errors}
          >
            <KuiFieldText
              name="text"
              isInvalid={this.state.showErrors}
            />
          </KuiFormRow>

          <KuiFormRow
            id={makeId()}
            label="Text area"
            isInvalid={this.state.showErrors}
          >
            <KuiTextArea
              name="area"
              isInvalid={this.state.showErrors}
            />
          </KuiFormRow>

          <KuiFormRow
            label="Select"
            isInvalid={this.state.showErrors}
          >
            <KuiSelect
              options={[
                { value: 'option_one', text: 'Option one' },
                { value: 'option_two', text: 'Option two' },
                { value: 'option_three', text: 'Option three' },
              ]}
              isInvalid={this.state.showErrors}
            />
          </KuiFormRow>

          {button}
        </KuiForm>
      </div>
    );
  }
}

