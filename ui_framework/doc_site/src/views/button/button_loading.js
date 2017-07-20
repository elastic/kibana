import React, {
  Component,
} from 'react';

import {
  KuiButtonIcon,
  KuiButton,
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
        <KuiButton
          buttonType="basic"
          onClick={this.onClick}
          isLoading={this.state.isLoading}
          disabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Loading...' : 'Load more'}
        </KuiButton>

        <br />

        <KuiButton
          buttonType="primary"
          onClick={this.onClick}
          icon={<KuiButtonIcon type="create" />}
          isLoading={this.state.isLoading}
          disabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Creating...' : 'Create'}
        </KuiButton>
      </div>
    );
  }
}
