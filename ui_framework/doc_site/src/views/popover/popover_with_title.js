import React, {
  Component,
} from 'react';

import {
  KuiPopover,
  KuiPopoverTitle,
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
  KuiText
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
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

  onButtonClick3() {
    this.setState({
      isPopoverOpen3: !this.state.isPopoverOpen3,
    });
  }

  closePopover3() {
    this.setState({
      isPopoverOpen3: false,
    });
  }

  render() {
    return (
      <KuiFlexGroup>
        <KuiFlexItem grow={false}>
          <KuiPopover
            button={(
              <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick1.bind(this)}>
                downCenter with title
              </KuiButton>
            )}
            isOpen={this.state.isPopoverOpen1}
            closePopover={this.closePopover1.bind(this)}
            anchorPosition="downCenter"
            withTitle
            panelPaddingSize="none"
          >
            <KuiPopoverTitle>Hello, I&rsquo;m a popover title</KuiPopoverTitle>
            <div style={{ width: '300px', padding: 16 }}>
              <KuiText>
                <p>
                  Popover content
                </p>
              </KuiText>
            </div>
          </KuiPopover>
        </KuiFlexItem>
        <KuiFlexItem grow={false}>
          <KuiPopover
            button={(
              <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick2.bind(this)}>
                upCenter with title
              </KuiButton>
            )}
            isOpen={this.state.isPopoverOpen2}
            closePopover={this.closePopover2.bind(this)}
            anchorPosition="upCenter"
            withTitle
            panelPaddingSize="none"
          >
            <KuiPopoverTitle>Hello, I&rsquo;m a popover title</KuiPopoverTitle>
            <div style={{ width: '300px', padding: 16 }}>
              <KuiText>
                <p>
                  Popover content
                </p>
              </KuiText>
            </div>
          </KuiPopover>
        </KuiFlexItem>
        <KuiFlexItem grow={false}>
          <KuiPopover
            button={(
              <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick3.bind(this)}>
                rightUp with title
              </KuiButton>
            )}
            isOpen={this.state.isPopoverOpen3}
            closePopover={this.closePopover3.bind(this)}
            anchorPosition="rightUp"
            withTitle
            panelPaddingSize="none"
          >
            <KuiPopoverTitle>Hello, I&rsquo;m a popover title</KuiPopoverTitle>
            <div style={{ width: '300px', padding: 16 }}>
              <KuiText>
                <p>
                  Popover content
                </p>
              </KuiText>
            </div>
          </KuiPopover>
        </KuiFlexItem>
      </KuiFlexGroup>
    );
  }
}
