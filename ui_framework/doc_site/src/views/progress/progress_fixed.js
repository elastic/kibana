import React, {
  Component,
} from 'react';

import {
  KuiProgress,
  KuiSpacer,
  KuiButton,
  KuiText,
  KuiPanel,
  KuiCallOut,
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
    let progress = null;

    if (this.state.showProgress) {
      progress = (
        <div>
          <KuiCallOut
            title="Look up!"
            type="warning"
            iconType="sortUp"
          >
            <p>
              The progress bar is fixed to the top of your browser.
            </p>
          </KuiCallOut>
          <KuiProgress value={this.state.value} max={100} size="s" position="fixed"/>
        </div>
      );
    }

    return (
      <div>

        <KuiPanel style={{ width: 300, position: 'relative' }}>
          <KuiProgress size="xs" color="accent" position="absolute" />
          <KuiText>
            <h2>Absolutely!</h2>
            <p>
              The progress bar is absolutely positioned in this panel. You could
              see how this might be useful in our Toast component.
            </p>
          </KuiText>
        </KuiPanel>

        <KuiSpacer size="l" />

        <KuiButton size="small" onClick={this.toggleProgress}>
          Toggle a fixed bar
        </KuiButton>

        <KuiSpacer size="l" />

        {progress}
      </div>
    );
  }
}
