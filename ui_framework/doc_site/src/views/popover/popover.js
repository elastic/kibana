import React, {
  Component,
} from 'react';

import {
  KuiPopover,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick() {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  render() {
    const button = (
      <button onClick={this.onButtonClick.bind(this)}>
        Click me
      </button>
    );

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
      >
        <div style={{ width: '300px' }}>Popover content that's wider than the default width</div>
      </KuiPopover>
    );
  }
}
