import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import tabbable from 'tabbable';

import { cascadingMenuKeyCodes } from '../../services';

import { KuiContextMenuPanel } from './context_menu_panel';
import { KuiContextMenuItem } from './context_menu_item';

export class KuiContextMenu extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    initialPanelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isVisible: PropTypes.bool.isRequired,
    idToPanelMap: PropTypes.object,
    idToPreviousPanelIdMap: PropTypes.object,
  }

  static defaultProps = {
    idToPanelMap: {},
    idToPreviousPanelIdMap: {},
    isVisible: true,
  }

  constructor(props) {
    super(props);

    this.resetTransitionTimeout = undefined;
    this.menuItems = [];

    this.state = {
      outGoingPanelId: undefined,
      currentPanelId: props.initialPanelId,
      transitionDirection: undefined,
      isTransitioning: false,
      focusedMenuItemIndex: 0,
    };
  }

  onKeyDown = e => {
    switch (e.keyCode) {
      case cascadingMenuKeyCodes.UP:
        if (this.menuItems.length) {
          e.preventDefault();
          this.setState(prevState => {
            const nextFocusedMenuItemIndex = prevState.focusedMenuItemIndex - 1;
            return {
              focusedMenuItemIndex: nextFocusedMenuItemIndex < 0 ? this.menuItems.length - 1 : nextFocusedMenuItemIndex,
            };
          });
        }
        break;

      case cascadingMenuKeyCodes.DOWN:
        if (this.menuItems.length) {
          e.preventDefault();
          this.setState(prevState => {
            const nextFocusedMenuItemIndex = prevState.focusedMenuItemIndex + 1;
            return {
              focusedMenuItemIndex: nextFocusedMenuItemIndex > this.menuItems.length - 1 ? 0 : nextFocusedMenuItemIndex,
            };
          });
        }
        break;

      case cascadingMenuKeyCodes.LEFT:
        e.preventDefault();
        this.showPreviousPanel();
        break;

      case cascadingMenuKeyCodes.RIGHT:
        if (this.menuItems.length) {
          e.preventDefault();
          this.menuItems[this.state.focusedMenuItemIndex].click();
        }
        break;

      default:
        break;
    }
  };

  hasPreviousPanel = panelId => {
    const previousPanelId = this.props.idToPreviousPanelIdMap[panelId];
    return typeof previousPanelId === 'number';
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
        transitionDirection: undefined,
        isTransitioning: false,
        focusedMenuItemIndex: 0,
      });
    }, 250);
  }

  showPreviousPanel = () => {
    // If there's a previous panel, then we can close the current panel to go back to it.
    if (this.hasPreviousPanel(this.state.currentPanelId)) {
      const previousPanelId = this.props.idToPreviousPanelIdMap[this.state.currentPanelId];
      this.showPanel(previousPanelId, 'previous');
    }
  };

  updateHeight() {
    const height = this.currentPanel.clientHeight;
    this.menu.setAttribute('style', `height: ${height}px`);
  }

  updateFocusedMenuItem() {
    // When the transition completes focus on a menu item or just the menu itself.
    if (!this.state.isTransitioning) {
      this.menuItems = this.currentPanel.querySelectorAll('[data-menu-item]');
      const focusedMenuItem = this.menuItems[this.state.focusedMenuItemIndex];
      if (focusedMenuItem) {
        focusedMenuItem.focus();
      } else {
        // Focus first tabbable item.
        const tabbableItems = tabbable(this.currentPanel);
        if (tabbableItems.length) {
          tabbableItems[0].focus();
        } else {
          document.activeElement.blur();
        }
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    // If the user is opening the context menu, reset the state.
    if (nextProps.isVisible && !this.props.isVisible) {
      this.setState({
        outGoingPanelId: undefined,
        currentPanelId: nextProps.initialPanelId,
        transitionDirection: undefined,
        focusedMenuItemIndex: 0,
      });
    }
  }

  componentDidMount() {
    this.updateHeight();
    this.updateFocusedMenuItem();
  }

  componentDidUpdate() {
    // Make sure we don't steal focus while the ContextMenu is closed.
    if (!this.props.isVisible) {
      return;
    }

    if (this.state.isTransitioning) {
      this.updateHeight();
    }

    this.updateFocusedMenuItem();
  }

  componentWillUnmount() {
    clearTimeout(this.resetTransitionTimeout);
  }

  renderPanel(panelId, transitionType) {
    const panel = this.props.idToPanelMap[panelId];

    if (!panel) {
      return;
    }

    const renderItems = items => items.map(item => {
      let onClick;

      if (item.onClick) {
        onClick = item.onClick;
      } else if (item.panel) {
        onClick = () => {
          // This component is commonly wrapped in a KuiOutsideClickDetector, which means we'll
          // need to wait for that logic to complete before re-rendering the DOM via showPanel.
          window.requestAnimationFrame(this.showPanel.bind(this, item.panel.id, 'next'));
        };
      }

      return (
        <KuiContextMenuItem
          key={item.name}
          icon={item.icon}
          onClick={onClick}
          hasPanel={Boolean(item.panel)}
          data-menu-item
        >
          {item.name}
        </KuiContextMenuItem>
      );
    });

    // As above, we need to wait for KuiOutsideClickDetector to complete its logic before
    // re-rendering via showPanel.
    let onClose;
    if (this.hasPreviousPanel(panelId)) {
      onClose = () => window.requestAnimationFrame(this.showPreviousPanel);
    }

    return (
      <KuiContextMenuPanel
        panelRef={node => {
          if (transitionType === 'in') {
            this.currentPanel = node;
          }
        }}
        title={panel.title}
        onClose={onClose}
        transitionType={transitionType}
        transitionDirection={this.state.transitionDirection}
      >
        {panel.content || renderItems(panel.items)}
      </KuiContextMenuPanel>
    );
  }

  render() {
    const {
      idToPanelMap, // eslint-disable-line no-unused-vars
      idToPreviousPanelIdMap, // eslint-disable-line no-unused-vars
      className,
      initialPanelId, // eslint-disable-line no-unused-vars
      isVisible, // eslint-disable-line no-unused-vars
      ...rest,
    } = this.props;

    const currentPanel = this.renderPanel(this.state.currentPanelId, 'in');
    let outGoingPanel;

    // Hide the out-going panel ASAP, so it can't take focus.
    if (this.state.isTransitioning) {
      outGoingPanel = this.renderPanel(this.state.outGoingPanelId, 'out');
    }

    const classes = classNames('kuiContextMenu', className);

    return (
      <div
        ref={node => { this.menu = node; }}
        className={classes}
        onKeyDown={this.onKeyDown}
        {...rest}
      >
        {outGoingPanel}
        {currentPanel}
      </div>
    );
  }
}
