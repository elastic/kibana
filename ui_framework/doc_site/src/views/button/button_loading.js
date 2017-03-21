import React, {
  Component,
} from 'react';

import {
  KuiCreateButtonIcon,
  KuiPrimaryButton,
  KuiBasicButton,
} from '../../../../components';

export default class LoadingButton extends Component {
  constructor(props) {
    super();

    this.state = {
      isLoading: props.isLoading || false,
    };

    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.setState({
      isLoading: true,
    });

    setTimeout(() => {
      this.setState({
        isLoading: false,
      });
    }, 3000);
  }

  render() {
    return (
      <div>
        <KuiBasicButton
          onClick={this.onClick}
          isLoading={this.state.isLoading}
          isDisabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Loading...' : 'Load more'}
        </KuiBasicButton>

        <br />

        <KuiPrimaryButton
          onClick={this.onClick}
          icon={<KuiCreateButtonIcon />}
          isLoading={this.state.isLoading}
          isDisabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Creating...' : 'Create'}
        </KuiPrimaryButton>
      </div>
    );
  }
}
