import React, {
  Component,
} from 'react';

import {
  KuiBottomBar,
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
  KuiProgress,
  KuiText,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showBar: false,
    };
  }

  onButtonClick() {
    this.setState({
      showBar: !this.state.showBar,
    });
  }

  render() {
    const button = (
      <KuiButton type="primary" onClick={this.onButtonClick.bind(this)}>
        Toggle appearance of the bottom bar
      </KuiButton>
    );

    let bottomBar;
    if (this.state.showBar) {
      bottomBar = (
        <KuiBottomBar>
          <KuiProgress size="xs" color="accent" position="absolute"/>
          <KuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <KuiFlexItem grow={false}>
              <KuiText>
                <p>Saving...</p>
              </KuiText>
            </KuiFlexItem>

            <KuiFlexItem grow={false}>
              <KuiFlexGroup gutterSize="small">
                <KuiFlexItem>
                  <KuiButton
                    type="danger"
                    size="small"
                    iconType="trash"
                  >
                    Delete
                  </KuiButton>
                </KuiFlexItem>

                <KuiFlexItem>
                  <KuiButton
                    type="primary"
                    size="small"
                    iconType="cross"
                  >
                    Cancel
                  </KuiButton>
                </KuiFlexItem>

                <KuiFlexItem>
                  <KuiButton
                    type="primary"
                    fill
                    size="small"
                    iconType="check"
                  >
                    Save
                  </KuiButton>
                </KuiFlexItem>
              </KuiFlexGroup>
            </KuiFlexItem>
          </KuiFlexGroup>
        </KuiBottomBar>

      );
    }

    return (
      <div>
        {button}
        {bottomBar}
      </div>
    );
  }
}
