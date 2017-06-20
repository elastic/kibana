import React from 'react';

import {
  KuiTabs
} from '../../../../components';

class KuiTabsExample extends React.Component {
  constructor(props) {
    super(props);

    this.tabs = [
      'Cobalt',
      'Dextrose',
      'Helium-3',
      'Monosodium Glutamate',
    ];

    this.state = {
      selectedTabIndex: 0,
    };

    this.onSelectedTabChanged = this.onSelectedTabChanged.bind(this);
  }

  onSelectedTabChanged(index) {
    this.setState({
      selectedTabIndex: index,
    });
  }

  render() {
    return (
      <KuiTabs
        selectedTabIndex={this.state.selectedTabIndex}
        onSelectedTabChanged={this.onSelectedTabChanged}
      >
        {this.tabs}
      </KuiTabs>
    );
  }
}

export default KuiTabsExample;
