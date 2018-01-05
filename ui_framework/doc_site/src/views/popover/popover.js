import React, {
  Component,
} from 'react';

import {
  KuiPopover,
  KuiButton,
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
      <KuiButton buttonType="basic" onClick={this.onButtonClick.bind(this)}>
        Show popover
      </KuiButton>
    );

    return (
      <KuiPopover
        ownFocus
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
      >
        <div style={{ width: '300px' }}>Popover content that&rsquo;s wider than the default width</div>
      </KuiPopover>
    );
  }
}
