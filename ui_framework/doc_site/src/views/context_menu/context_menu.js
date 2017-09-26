import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiContextMenu,
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiPopover,
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
          <span className="kuiIcon fa-search" />
        ),
        onClick: () => window.alert('Show fullscreen'),
      }, {
        name: 'Share this dasbhoard',
        icon: <span className="kuiIcon fa-user" />,
        panel: {
          id: 1,
          title: 'Share this dashboard',
          items: [{
            name: 'PDF reports',
            icon: <span className="kuiIcon fa-user" />,
            onClick: () => window.alert('PDF reports'),
          }, {
            name: 'CSV reports',
            icon: <span className="kuiIcon fa-user" />,
            onClick: () => window.alert('CSV reports'),
          }, {
            name: 'Embed code',
            icon: <span className="kuiIcon fa-user" />,
            panel: {
              id: 2,
              title: 'Embed code',
              content: (
                <div style={{ padding: 16 }}>
                  <div className="kuiVerticalRhythmSmall">
                    <KuiFieldGroup>
                      <KuiFieldGroupSection isWide>
                        <div className="kuiSearchInput">
                          <div className="kuiSearchInput__icon kuiIcon fa-search" />
                          <input
                            className="kuiSearchInput__input"
                            type="text"
                          />
                        </div>
                      </KuiFieldGroupSection>

                      <KuiFieldGroupSection>
                        <select className="kuiSelect">
                          <option>Animal</option>
                          <option>Mineral</option>
                          <option>Vegetable</option>
                        </select>
                      </KuiFieldGroupSection>
                    </KuiFieldGroup>
                  </div>

                  <div className="kuiVerticalRhythmSmall">
                    <KuiButton buttonType="primary">Save</KuiButton>
                  </div>
                </div>
              ),
            },
          }, {
            name: 'Permalinks',
            icon: <span className="kuiIcon fa-user" />,
            onClick: () => window.alert('Permalinks'),
          }],
        },
      }, {
        name: 'Edit / add panels',
        icon: <span className="kuiIcon fa-user" />,
        onClick: () => window.alert('Edit / add panels'),
      }, {
        name: 'Display options',
        icon: <span className="kuiIcon fa-user" />,
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
      <KuiButton buttonType="basic" onClick={this.onButtonClick.bind(this)}>
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
