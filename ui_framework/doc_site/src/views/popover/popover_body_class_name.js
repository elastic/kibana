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
        button={(
          <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick.bind(this)}>
            Use bodyClassName prop to pass a custom class
          </KuiButton>
        )}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        bodyClassName="yourClassNameHere"
      >
        It&rsquo;s hard to tell but there&rsquo;s a custom class on this element, but there is!
      </KuiPopover>
    );
  }
}
