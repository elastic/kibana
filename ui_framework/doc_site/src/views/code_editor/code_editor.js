import React, { Component } from 'react';

import {
  KuiCodeEditor
} from '../../../../components';

export default class extends Component {
  state = {
    value: ''
  };

  onChange = (value) => {
    this.setState({ value });
  };

  render() {
    return (
      <KuiCodeEditor
        mode="less"
        theme="github"
        width="100%"
        value={this.state.value}
        onChange={this.onChange}
        setOptions={{ fontSize: '14px' }}
        onBlur={() => console.log('KuiCodeEditor.onBlur() called')}
      />
    );
  }
}
