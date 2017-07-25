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
    return (
      <KuiPopover
        button={(
          <button onClick={this.onButtonClick.bind(this)}>
            Custom class
          </button>
        )}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        bodyClassName="yourClassNameHere"
      >
        It&rsquo;s hard to tell but there&rsquo;s a custom class on this element
      </KuiPopover>
    );
  }
}
