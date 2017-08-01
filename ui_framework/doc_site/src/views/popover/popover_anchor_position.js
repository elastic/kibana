import React, {
  Component,
} from 'react';

import {
  KuiPopover,
} from '../../../../components/';

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
      <div>
        <KuiPopover
          button= {(
            <button onClick={this.onButtonClick.bind(this)}>
              Popover anchored to the right.
            </button>
          )}
          isOpen={this.state.isPopoverOpen}
          anchorPosition="right"
          closePopover={() => {}}
        >
          Popover content
        </KuiPopover>

        &nbsp;

        <KuiPopover
          button= {(
            <button onClick={this.onButtonClick.bind(this)}>
              Popover anchored to the left.
            </button>
          )}
          isOpen={this.state.isPopoverOpen}
          anchorPosition="left"
          closePopover={() => {}}
        >
          Popover content
        </KuiPopover>
      </div>
    );
  }
}
