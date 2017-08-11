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

    const formOptions = ['Option one', 'Option two', 'Option three'];

    let errors = null;
    if (this.state.showErrors) {
      errors = ['Here\'s an example of an error', 'You might have more than one error, so pass an array.'];
    } else {
      errors = null;
    }


    return (
      <div>
        <br/>
        <br/>
        <br/>
        <KuiForm invalid={this.state.showErrors} errors={errors}>
          <KuiFormRow
            id="first"
            label="Validation only"
            invalid={this.state.showErrors}
          >
            <KuiFieldText id="first" name="first" />
          </KuiFormRow>
          <KuiFormRow
            id="first"
            label="Validation with helptext and errors"
            helpText="I am some friendly help text."
            invalid={this.state.showErrors}
            errors={errors}
          >
            <KuiFieldText id="first" name="first" />
          </KuiFormRow>
          <KuiFormRow label="Non text field works the same" invalid={this.state.showErrors}>
            <KuiCheckbox options={formOptions} />
          </KuiFormRow>
          {button}
        </KuiForm>
      </div>
    );
  }
}

