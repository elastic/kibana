
import React, {
  Component,
} from 'react';

import {
  KuiBottomBar,
  KuiFlexGroup,
  KuiFlexItem,
  KuiButton,
  KuiButtonEmpty,
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
          <KuiFlexGroup justifyContent="spaceBetween">
            <KuiFlexItem grow={false}>
              <KuiFlexGroup gutterSize="small">
                <KuiFlexItem>
                  <KuiButton type="ghost" size="small" iconType="help">Help</KuiButton>
                </KuiFlexItem>
                <KuiFlexItem>
                  <KuiButton type="ghost" size="small" iconType="user">Add user</KuiButton>
                </KuiFlexItem>
              </KuiFlexGroup>
            </KuiFlexItem>
            <KuiFlexItem grow={false}>
              <KuiFlexGroup gutterSize="small">
                <KuiFlexItem>
                  <KuiButtonEmpty type="ghost" size="small" iconType="check">Save</KuiButtonEmpty>
                </KuiFlexItem>
                <KuiFlexItem>
                  <KuiButtonEmpty type="ghost" size="small" iconType="cross">Discard</KuiButtonEmpty>
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
