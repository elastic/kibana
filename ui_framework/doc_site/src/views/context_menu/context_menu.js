import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiContextMenu,
  KuiFormRow,
  KuiIcon,
  KuiPopover,
  KuiSwitch,
} from '../../../../components';

function convertPanelTreeToMap(panel, map = {}) {
  if (panel) {
    map[panel.id] = panel;

    if (panel.items) {
      panel.items.forEach(item => convertPanelTreeToMap(item.panel, map));
    }
  }

  return map;
}

function extractPreviousIds(panels) {
  const idToPreviousPanelIdMap = {};

  Object.keys(panels).forEach(panelId => {
    const panel = panels[panelId];
    if (Array.isArray(panel.items)) {
      panel.items.forEach(item => {
        const isCloseable = Boolean(item.panel);
        if (isCloseable) {
          idToPreviousPanelIdMap[item.panel.id] = panel.id;
        }
      });
    }
  });

  return idToPreviousPanelIdMap;
}

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };

    const panelTree = {
      id: 0,
      title: 'View options',
      items: [{
        name: 'Show fullscreen',
        icon: (
          <KuiIcon
            type="search"
            size="medium"
          />
        ),
        onClick: () => window.alert('Show fullscreen'),
      }, {
        name: 'Share this dasbhoard',
        icon: 'user',
        panel: {
          id: 1,
          title: 'Share this dashboard',
          items: [{
            name: 'PDF reports',
            icon: 'user',
            onClick: () => window.alert('PDF reports'),
          }, {
            name: 'CSV reports',
            icon: 'user',
            onClick: () => window.alert('CSV reports'),
          }, {
            name: 'Embed code',
            icon: 'user',
            panel: {
              id: 2,
              title: 'Share this dashboard',
              content: (
                <div style={{ padding: 16 }}>
                  <KuiFormRow
                    label="Generate a public snapshot?"
                  >
                    <KuiSwitch
                      name="switch"
                      id="asdf"
                      label="Snapshot data"
                    />
                  </KuiFormRow>
                  <KuiFormRow
                    label="Include the following in the embed"
                  >
                    <KuiSwitch
                      name="switch"
                      id="asdf2"
                      label="Current time range"
                    />
                  </KuiFormRow>
                  <KuiButton fill>Copy iFrame code</KuiButton>
                </div>
              ),
            },
          }, {
            name: 'Permalinks',
            icon: 'user',
            onClick: () => window.alert('Permalinks'),
          }],
        },
      }, {
        name: 'Edit / add panels',
        icon: 'user',
        onClick: () => window.alert('Edit / add panels'),
      }, {
        name: 'Display options',
        icon: 'user',
        onClick: () => window.alert('Display options'),
      }],
    };

    this.idToPanelMap = convertPanelTreeToMap(panelTree);
    this.idToPreviousPanelIdMap = extractPreviousIds(this.idToPanelMap);
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
      <KuiButton iconType="arrowDown" iconSide="right" onClick={this.onButtonClick.bind(this)}>
        Click me to load a context menu
      </KuiButton>
    );

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        panelPaddingSize="none"
        withTitle
      >
        <KuiContextMenu
          initialPanelId={0}
          isVisible={this.state.isPopoverOpen}
          idToPanelMap={this.idToPanelMap}
          idToPreviousPanelIdMap={this.idToPreviousPanelIdMap}
        />
      </KuiPopover>
    );
  }
}
