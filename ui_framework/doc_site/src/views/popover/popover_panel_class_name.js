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
    return (
      <KuiPopover
        ownFocus
        button={(
          <KuiButton buttonType="basic" onClick={this.onButtonClick.bind(this)}>
            Turn padding off and apply a custom class
          </KuiButton>
        )}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        panelClassName="yourClassNameHere"
        panelPaddingSize="none"
      >
        This should have no padding, and if you inspect, also a custom class.
      </KuiPopover>
    );
  }
}
