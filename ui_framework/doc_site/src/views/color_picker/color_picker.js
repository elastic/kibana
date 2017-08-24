import React from 'react';

import { KuiColorPicker } from '../../../../components';

export class ColorPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      color: '#ffffff'
    };
  }

  handleChange = (value) => {
    this.setState({ color: value });
  };

  render() {
    return <KuiColorPicker onChange={this.handleChange} color={this.state.color}/>;
  }
}
