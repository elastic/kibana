import React from 'react';

import {
  KuiTabs,
  KuiTab,
} from '../../../../components';

class KuiTabsExample extends React.Component {
  constructor(props) {
    super(props);

    this.tabs = [{
      id: 'cobalt',
      name: 'Cobalt',
    }, {
      id: 'dextrose',
      name: 'Dextrose',
    }, {
      id: 'helium_3',
      name: 'Helium-3',
    }, {
      id: 'monosodium_glutammate',
      name: 'Monosodium Glutamate',
    }];

    this.state = {
      selectedTabId: 'cobalt',
    };
  }

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs() {
    return this.tabs.map((tab, index) => (
      <KuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </KuiTab>
    ));
  }

  render() {
    return (
      <KuiTabs>
        {this.renderTabs()}
      </KuiTabs>
    );
  }
}

export default KuiTabsExample;
