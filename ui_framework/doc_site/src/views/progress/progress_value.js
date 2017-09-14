import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
  KuiProgress,
  KuiText,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: 0,
      showProgress: false,
    };

    this.toggleProgress = this.toggleProgress.bind(this);
  }

  toggleProgress() {
    const currentState = this.state.showProgress;

    if (!currentState) {
      this.timer = setTimeout(() => this.progress(0), 250);
    } else {
      clearTimeout(this.timer);
      this.setState({ value: 0 });
    }

    this.setState({
      showProgress: !this.state.showProgress,
    });
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  progress(value) {
    if (value > 100) {
      this.setState({ value: 100 });
    } else {
      this.setState({ value });
      const diff = Math.round(Math.random() * 10);
      this.timer = setTimeout(() => this.progress(value + diff), 250);
    }
  }

  render() {

    return (
      <KuiFlexGroup alignItems="center">
        <KuiFlexItem grow={false}>
          <KuiButton size="small" onClick={this.toggleProgress}>
            Toggle progress
          </KuiButton>
        </KuiFlexItem>
        <KuiFlexItem grow={false}>
          <KuiText>
            <p>
              {this.state.value}
            </p>
          </KuiText>
        </KuiFlexItem>
        <KuiFlexItem>
          <KuiProgress value={this.state.value} max={100} size="xs" />
        </KuiFlexItem>
      </KuiFlexGroup>
    );
  }
}
