import React from 'react';

import { KuiColorPicker } from '../../../../components/index';

export class ColorPickerLabelAndClear extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      color: null
    };
  }

  handleChange = (value) => {
    this.setState({ color: value });
  };

  render() {
    return (
      <KuiColorPicker
        onChange={ this.handleChange }
        color={ this.state.color }
        label="Background Color"
        showClearLink={ true }
        showColorLabel={ false }
      />
    );
  }
}
