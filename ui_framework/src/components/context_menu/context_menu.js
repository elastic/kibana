import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiContextMenuPanel } from './context_menu_panel';
import { KuiContextMenuItem } from './context_menu_item';

function mapIdsToPanels(panels) {
  const map = {};

  panels.forEach(panel => {
    map[panel.id] = panel;
  });

  return map;
}

function extractPreviousIds(panels) {
  const idToPreviousPanelIdMap = {};

  panels.forEach(panel => {
    if (Array.isArray(panel.items)) {
      panel.items.forEach(item => {
        const isCloseable = item.panel !== undefined;
        if (isCloseable) {
          idToPreviousPanelIdMap[item.panel] = panel.id;
        }
      });
    }
  });

  return idToPreviousPanelIdMap;
}

export class KuiContextMenu extends Component {
  static propTypes = {
    className: PropTypes.string,
    panels: PropTypes.array,
    initialPanelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isVisible: PropTypes.bool.isRequired,
  }

  static defaultProps = {
    panels: [],
    isVisible: true,
  }

  constructor(props) {
    super(props);

    this.resetTransitionTimeout = undefined;
    this.itemIndexToPanelIdMap = {};
    this.panelIdToItemIndexMap = {};

    this.state = {
      height: undefined,
      outGoingPanelId: undefined,
      currentPanelId: props.initialPanelId,
      transitionDirection: undefined,
      isTransitioning: false,
      focusItemIndex: undefined,
      idToPanelMap: {},
      idToPreviousPanelIdMap: {},
    };
  }

  hasPreviousPanel = panelId => {
    const previousPanelId = this.state.idToPreviousPanelIdMap[panelId];
    return typeof previousPanelId !== 'undefined';
  };

  showPanel(panelId, direction) {
    clearTimeout(this.resetTransitionTimeout);

    this.setState({
      outGoingPanelId: this.state.currentPanelId,
      currentPanelId: panelId,
      transitionDirection: direction,
      isTransitioning: true,
    });

    // Queue the transition to reset.
    this.resetTransitionTimeout = setTimeout(() => {
      this.setState({
        isTransitioning: false,
      });
    }, 250);
  }

  showNextPanel = itemIndex => {
    const nextPanelId = this.itemIndexToPanelIdMap[itemIndex];
    if (nextPanelId) {
      this.showPanel(nextPanelId, 'next');
    }
  };

  showPreviousPanel = () => {
    // If there's a previous panel, then we can close the current panel to go back to it.
    if (this.hasPreviousPanel(this.state.currentPanelId)) {
      const previousPanelId = this.state.idToPreviousPanelIdMap[this.state.currentPanelId];

      // Set focus on the item which shows the panel we're leaving.
      const previousPanel = this.state.idToPanelMap[previousPanelId];
      const focusItemIndex = previousPanel.items.findIndex(
        item => item.panel === this.state.currentPanelId
      );

      if (focusItemIndex !== -1) {
        this.setState({
          focusItemIndex,
        });
      }

      this.showPanel(previousPanelId, 'previous');
    }
  };

  onCurrentPanelHeightChange = height => {
    this.setState({
      height,
    });
  }

  updatePanelMaps(panels) {
    const idToPanelMap = mapIdsToPanels(panels);
    const idToPreviousPanelIdMap = extractPreviousIds(panels);

    this.setState({
      idToPanelMap,
      idToPreviousPanelIdMap,
    });
  }

  componentWillMount() {
    this.updatePanelMaps(this.props.panels);
  }

  componentWillReceiveProps(nextProps) {
    // If the user is opening the context menu, reset the state.
    if (nextProps.isVisible && !this.props.isVisible) {
      this.setState({
        outGoingPanelId: undefined,
        currentPanelId: nextProps.initialPanelId,
        transitionDirection: undefined,
        focusItemIndex: undefined,
      });
    }

    if (nextProps.panels !== this.props.panels) {
      this.updatePanelMaps(nextProps.panels);
    }
  }

  componentDidUpdate() {
    // Make sure we don't steal focus while the ContextMenu is closed.
    if (!this.props.isVisible) {
      return;
    }
  }

  componentWillUnmount() {
    clearTimeout(this.resetTransitionTimeout);
  }

  renderItems(items = []) {
    return items.map((item, index) => {
      const {
        panel,
        name,
        icon,
        onClick,
        ...rest,
      } = item;

      const onClickHandler = panel
        ? () => {
          // This component is commonly wrapped in a KuiOutsideClickDetector, which means we'll
          // need to wait for that logic to complete before re-rendering the DOM via showPanel.
          window.requestAnimationFrame(() => {
            if (onClick) onClick();
            this.showNextPanel(index);
          });
        } : onClick;

      return (
        <KuiContextMenuItem
          key={name}
          icon={icon}
          onClick={onClickHandler}
          hasPanel={Boolean(panel)}
          {...rest}
        >
          {name}
        </KuiContextMenuItem>
      );
    });
  }

  renderPanel(panelId, transitionType) {
    const panel = this.state.idToPanelMap[panelId];

    if (!panel) {
      return;
    }

    // TODO: Build this data structure once, e.g. constructor + willReceiveProps.
    if (transitionType === 'in') {
      this.itemIndexToPanelIdMap = {};

      if (panel.items) {
        panel.items.forEach((item, index) => {
          if (item.panel) {
            this.itemIndexToPanelIdMap[index] = item.panel;
          }
        });
      }
    }

    // As above, we need to wait for KuiOutsideClickDetector to complete its logic before
    // re-rendering via showPanel.
    let onClose;
    if (this.hasPreviousPanel(panelId)) {
      onClose = () => window.requestAnimationFrame(this.showPreviousPanel);
    }

    return (
      <KuiContextMenuPanel
        key={panelId}
        className="kuiContextMenu__panel"
        onHeightChange={(transitionType === 'in') ? this.onCurrentPanelHeightChange : undefined}
        title={panel.title}
        onClose={onClose}
        transitionType={transitionType}
        transitionDirection={this.state.transitionDirection}
        isTransitioning={this.state.isTransitioning}
        isActive={transitionType === 'in'}
        items={this.renderItems(panel.items)}
        focusItemIndex={
          // Set focus on the item which shows the panel we're leaving.
          transitionType === 'in' && this.state.transitionDirection === 'previous'
          ? this.state.focusItemIndex
          : undefined
        }
        showNextPanel={this.showNextPanel}
        showPreviousPanel={this.showPreviousPanel}
      >
        {panel.content}
      </KuiContextMenuPanel>
    );
  }

  render() {
    const {
      panels, // eslint-disable-line no-unused-vars
      className,
      initialPanelId, // eslint-disable-line no-unused-vars
      isVisible, // eslint-disable-line no-unused-vars
      ...rest,
    } = this.props;

    const currentPanel = this.renderPanel(this.state.currentPanelId, 'in');
    let outGoingPanel;

    // Hide the out-going panel as soon as it's done transitioning, so it can't take focus.
    if (this.state.isTransitioning) {
      outGoingPanel = this.renderPanel(this.state.outGoingPanelId, 'out');
    }

    const classes = classNames('kuiContextMenu', className);

    return (
      <div
        ref={node => { this.menu = node; }}
        className={classes}
        style={{ height: this.state.height }}
        {...rest}
      >
        {outGoingPanel}
        {currentPanel}
      </div>
    );
  }
}
