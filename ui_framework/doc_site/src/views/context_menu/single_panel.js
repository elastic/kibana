import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiContextMenuPanel,
  KuiContextMenuItem,
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
      <KuiButton buttonType="basic" onClick={this.onButtonClick.bind(this)}>
        Click me to load a context menu
      </KuiButton>
    );

    const items = [(
      <KuiContextMenuItem
        key="A"
        icon={<span className="kuiIcon fa-user" />}
        onClick={() => { window.alert('A'); }}
      >
        Option A
      </KuiContextMenuItem>
    ), (
      <KuiContextMenuItem
        key="B"
        icon={<span className="kuiIcon fa-user" />}
        onClick={() => { window.alert('B'); }}
      >
        Option B
      </KuiContextMenuItem>
    ), (
      <KuiContextMenuItem
        key="C"
        icon={<span className="kuiIcon fa-user" />}
        onClick={() => { window.alert('C'); }}
      >
        Option C
      </KuiContextMenuItem>
    )];

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        panelPaddingSize="none"
        withTitle
        anchorPosition="left"
      >
        <KuiContextMenuPanel
          title="Options"
          items={items}
        />
      </KuiPopover>
    );
  }
}
