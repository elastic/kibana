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
          type={KuiButton.TYPE.BASIC}
          onClick={this.onClick}
          isLoading={this.state.isLoading}
          isDisabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Loading...' : 'Load more'}
        </KuiButton>

        <br />

        <KuiButton
          type={KuiButton.TYPE.PRIMARY}
          onClick={this.onClick}
          icon={<KuiButtonIcon type={KuiButtonIcon.TYPE.CREATE} />}
          isLoading={this.state.isLoading}
          isDisabled={this.state.isLoading}
        >
          {this.state.isLoading ? 'Creating...' : 'Create'}
        </KuiButton>
      </div>
    );
  }
}
