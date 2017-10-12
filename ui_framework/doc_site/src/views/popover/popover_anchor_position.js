import React, {
  Component,
} from 'react';

import {
  KuiPopover,
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
  KuiSpacer,
  KuiText,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen1: false,
      isPopoverOpen2: false,
      isPopoverOpen3: false,
      isPopoverOpen4: false,
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

  onButtonClick4() {
    this.setState({
      isPopoverOpen4: !this.state.isPopoverOpen4,
    });
  }

  closePopover4() {
    this.setState({
      isPopoverOpen4: false,
    });
  }

  onButtonClick5() {
    this.setState({
      isPopoverOpen5: !this.state.isPopoverOpen5,
    });
  }

  closePopover5() {
    this.setState({
      isPopoverOpen5: false,
    });
  }

  onButtonClick6() {
    this.setState({
      isPopoverOpen6: !this.state.isPopoverOpen6,
    });
  }

  closePopover6() {
    this.setState({
      isPopoverOpen6: false,
    });
  }


  onButtonClick7() {
    this.setState({
      isPopoverOpen7: !this.state.isPopoverOpen7,
    });
  }

  closePopover7() {
    this.setState({
      isPopoverOpen7: false,
    });
  }

  onButtonClick8() {
    this.setState({
      isPopoverOpen8: !this.state.isPopoverOpen8,
    });
  }

  closePopover8() {
    this.setState({
      isPopoverOpen8: false,
    });
  }

  onButtonClick9() {
    this.setState({
      isPopoverOpen9: !this.state.isPopoverOpen9,
    });
  }

  closePopover9() {
    this.setState({
      isPopoverOpen9: false,
    });
  }

  onButtonClick10() {
    this.setState({
      isPopoverOpen10: !this.state.isPopoverOpen10,
    });
  }

  closePopover10() {
    this.setState({
      isPopoverOpen10: false,
    });
  }

  onButtonClick11() {
    this.setState({
      isPopoverOpen11: !this.state.isPopoverOpen11,
    });
  }

  closePopover11() {
    this.setState({
      isPopoverOpen11: false,
    });
  }

  onButtonClick12() {
    this.setState({
      isPopoverOpen12: !this.state.isPopoverOpen12,
    });
  }

  closePopover12() {
    this.setState({
      isPopoverOpen12: false,
    });
  }


  render() {
    return (
      <div>

        <KuiFlexGroup>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick1.bind(this)}>
                  downLeft
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen1}
              closePopover={this.closePopover1.bind(this)}
              anchorPosition="downLeft"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick2.bind(this)}>
                  downCenter
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen2}
              closePopover={this.closePopover2.bind(this)}
              anchorPosition="downCenter"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick3.bind(this)}>
                  downRight
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen3}
              closePopover={this.closePopover3.bind(this)}
              anchorPosition="downRight"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
        </KuiFlexGroup>

        <KuiSpacer size="l" />

        <KuiFlexGroup>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick4.bind(this)}>
                  upLeft
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen4}
              closePopover={this.closePopover4.bind(this)}
              anchorPosition="upLeft"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick5.bind(this)}>
                  upCenter
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen5}
              closePopover={this.closePopover5.bind(this)}
              anchorPosition="upCenter"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick6.bind(this)}>
                  upRight
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen6}
              closePopover={this.closePopover6.bind(this)}
              anchorPosition="upRight"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
        </KuiFlexGroup>

        <KuiSpacer size="l" />

        <KuiFlexGroup>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick7.bind(this)}>
                  leftUp
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen7}
              closePopover={this.closePopover7.bind(this)}
              anchorPosition="leftUp"
            >
              <KuiText>
                <p>
                  Be careful with content within left or right aligned popovers. There needs to be
                  enough content to make make enough height for the arrow positioning.
                </p>
              </KuiText>
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick8.bind(this)}>
                  leftCenter
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen8}
              closePopover={this.closePopover8.bind(this)}
              anchorPosition="leftCenter"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick9.bind(this)}>
                  leftDown
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen9}
              closePopover={this.closePopover9.bind(this)}
              anchorPosition="leftDown"
            >
              <KuiText>
                <p>
                  Be careful with content within left or right aligned popovers. There needs to be
                  enough content to make make enough height for the arrow positioning.
                </p>
              </KuiText>
            </KuiPopover>
          </KuiFlexItem>
        </KuiFlexGroup>

        <KuiSpacer size="l" />

        <KuiFlexGroup>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick10.bind(this)}>
                  rightUp
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen10}
              closePopover={this.closePopover10.bind(this)}
              anchorPosition="rightUp"
            >
              <KuiText>
                <p>
                  Be careful with content within left or right aligned popovers. There needs to be
                  enough content to make make enough height for the arrow positioning.
                </p>
              </KuiText>
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick11.bind(this)}>
                  rightCenter
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen11}
              closePopover={this.closePopover11.bind(this)}
              anchorPosition="rightCenter"
            >
              Popover content
            </KuiPopover>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiPopover
              button={(
                <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick12.bind(this)}>
                  rightDown
                </KuiButton>
              )}
              isOpen={this.state.isPopoverOpen12}
              closePopover={this.closePopover12.bind(this)}
              anchorPosition="rightDown"
            >
              <KuiText>
                <p>
                  Be careful with content within left or right aligned popovers. There needs to be
                  enough content to make make enough height for the arrow positioning.
                </p>
              </KuiText>
            </KuiPopover>
          </KuiFlexItem>
        </KuiFlexGroup>

      </div>
    );
  }
}
