import React, {
  Component,
} from 'react';

import {
  KuiComboBox,
  KuiComboBoxOption,
  KuiComboBoxOptions,
  KuiComboBoxSection,
  KuiComboBoxText,
  KuiComboBoxTitle,
} from '../../../../components';

export default class extends Component {
  constructor() {
    super();

    this.state = {
      input: '',
      options: [
        'XS',
        'SM',
        'M',
        'L',
        'XL',
        'XXL',
      ],
    };

    this.onInputChange = this.onInputChange.bind(this);
    this.onOptionClick = this.onOptionClick.bind(this);
  }

  onInputChange(e) {
    this.setState({
      input: e.target.value,
    });
  }

  onOptionClick(option) {
    this.setState({
      input: option,
    });
  }

  renderOptions() {
    const normalizedInput = this.state.input.toLowerCase().trim();

    const matchingOptions = this.state.options.filter(option => {
      const normalizedOption = option.toLowerCase().trim();
      return normalizedOption.indexOf(normalizedInput) > -1;
    });

    let options;

    if (matchingOptions.length) {
      const renderedOptions = matchingOptions.map((option, index) => (
        <KuiComboBoxOption
          key={index}
          onClick={() => this.onOptionClick(option)}
        >
          {option}
        </KuiComboBoxOption>
      ));

      options = (
        <KuiComboBoxOptions>
          {renderedOptions}
        </KuiComboBoxOptions>
      );
    } else {
      options = (
        <KuiComboBoxOptions>
          <KuiComboBoxText>
            -
          </KuiComboBoxText>
        </KuiComboBoxOptions>
      );
    }

    return (
      <KuiComboBoxSection>
        <KuiComboBoxTitle>
          Size
        </KuiComboBoxTitle>

        {options}
      </KuiComboBoxSection>
    );
  }

  render() {
    return (
      <div>
        <KuiComboBox
          value={this.state.input}
          onChange={this.onInputChange}
          size="small"
        >
          {this.renderOptions()}
        </KuiComboBox>
      </div>
    );
  }
}
