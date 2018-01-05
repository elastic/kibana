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
      isPopoverOpen1: false,
      isPopoverOpen2: false,
    };
  }

  onButtonClick1() {
    this.setState({
      isPopoverOpen1: !this.state.isPopoverOpen1,
    });
  }

  closePopover1() {
    this.setState({
      isPopoverOpen1: false,
    });
  }

  onButtonClick2() {
    this.setState({
      isPopoverOpen2: !this.state.isPopoverOpen2,
    });
  }

  closePopover2() {
    this.setState({
      isPopoverOpen2: false,
    });
  }

  render() {
    return (
      <div>
        <KuiPopover
          ownFocus
          button={(
            <KuiButton buttonType="basic" onClick={this.onButtonClick1.bind(this)}>
              Popover anchored to the right.
            </KuiButton>
          )}
          isOpen={this.state.isPopoverOpen1}
          closePopover={this.closePopover1.bind(this)}
          anchorPosition="right"
        >
          Popover content
        </KuiPopover>

        &nbsp;

        <KuiPopover
          ownFocus
          button={(
            <KuiButton buttonType="basic" onClick={this.onButtonClick2.bind(this)}>
              Popover anchored to the left.
            </KuiButton>
          )}
          isOpen={this.state.isPopoverOpen2}
          closePopover={this.closePopover2.bind(this)}
          anchorPosition="left"
        >
          Popover content
        </KuiPopover>
      </div>
    );
  }
}
