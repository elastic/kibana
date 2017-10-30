import React, {
  Component,
} from 'react';
import {
  KuiTextArea,
} from '../../../../components';

class KuiTextAreaNonResizableExample extends Component {
  state = {
    value1: 'Non-resizable',
  };

  handleChange = (event, key) => {
    this.setState({ [key]: event.target.value });
  }

  render() {
    return (
      <KuiTextArea
        value={this.state.value1}
        onChange={event => this.handleChange(event, 'value1')}
        isNonResizable
      />
    );
  }
}

export default KuiTextAreaNonResizableExample;
