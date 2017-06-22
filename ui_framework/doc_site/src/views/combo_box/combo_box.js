import React, {
  Component,
} from 'react';

import {
  KuiComboBox,
  KuiComboBoxOption,
  KuiComboBoxOptions,
  KuiComboBoxOptionType,
  KuiComboBoxSection,
  KuiComboBoxText,
  KuiComboBoxTitle,
} from '../../../../components';

export default class extends Component {
  constructor() {
    super();

    this.state = {
      input: '',
      options: [{
        name: 'Apple',
        type: 'fruit',
      }, {
        name: 'Banana',
        type: 'fruit',
      }, {
        name: 'Cucumber',
        type: 'veggie',
      }, {
        name: 'Dandelion',
        type: 'flower',
      }, {
        name: 'Eggplant',
        type: 'veggie',
      }, {
        name: 'Fungus',
        type: 'other',
      }],
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
      input: option.name,
    });
  }

  renderOptions() {
    const normalizedInput = this.state.input.toLowerCase().trim();

    const matchingOptions = this.state.options.filter(option => {
      const normalizedOptionName = option.name.toLowerCase().trim();
      const normalizedOptionType = option.type.toLowerCase().trim();
      return (
        normalizedOptionName.indexOf(normalizedInput) > -1
        || normalizedOptionType.indexOf(normalizedInput) > -1
      );
    });

    let options;

    if (matchingOptions.length) {
      const renderedOptions = matchingOptions.map((option, index) => (
        <KuiComboBoxOption
          key={index}
          onClick={() => this.onOptionClick(option)}
        >
          {option.name}
          <KuiComboBoxOptionType>
            {option.type}
          </KuiComboBoxOptionType>
        </KuiComboBoxOption>
      ));

      options = (
        <KuiComboBoxOptions>
          <KuiComboBoxText>
            These are the options which match your search.
          </KuiComboBoxText>

          {renderedOptions}
        </KuiComboBoxOptions>
      );
    } else {
      options = (
        <KuiComboBoxOptions>
          <KuiComboBoxText>
            No options match your search.
          </KuiComboBoxText>
        </KuiComboBoxOptions>
      );
    }

    return (
      <KuiComboBoxSection>
        <KuiComboBoxTitle>
          Options
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
        >
          {this.renderOptions()}

          <KuiComboBoxSection>
            <KuiComboBoxTitle>
              Disabled options
            </KuiComboBoxTitle>

            <KuiComboBoxOptions>
              <KuiComboBoxOption isDisabled>
                Allosaurus

                <KuiComboBoxOptionType>
                  dino
                </KuiComboBoxOptionType>
              </KuiComboBoxOption>

              <KuiComboBoxOption isDisabled>
                Ankylosaurus

                <KuiComboBoxOptionType>
                  dino
                </KuiComboBoxOptionType>
              </KuiComboBoxOption>

              <KuiComboBoxOption isDisabled>
                Dimetrodron

                <KuiComboBoxOptionType>
                  dino
                </KuiComboBoxOptionType>
              </KuiComboBoxOption>
            </KuiComboBoxOptions>
          </KuiComboBoxSection>
        </KuiComboBox>
      </div>
    );
  }
}
