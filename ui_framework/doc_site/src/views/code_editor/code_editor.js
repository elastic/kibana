import React, { Component } from 'react';

import {
  KuiCodeEditor
} from '../../../../components';

export default class extends Component {
  state = {
    value: ''
  };

  render() {
    return (
      <KuiCodeEditor
        mode="less"
        theme="github"
        width="100%"
        value={this.state.value}
        onChange={(value) => this.setState({ value })}
        setOptions={{ fontSize: '14px' }}
        onBlur={() => window.alert('KuiCodeEditor.onBlur() called')}
      />
    );
  }
}
