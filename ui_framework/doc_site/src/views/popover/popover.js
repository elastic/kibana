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

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  render() {
    const button = (
      <button onClick={this.onButtonClick.bind(this)}>
        Click me
      </button>
    );
    console.log('owner', this.state.isPopoverOpen)
    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
      >
        <div style={{ width: '300px' }}>Popover content that&rsquo;s wider than the default width</div>
      </KuiPopover>
    );
  }
}
