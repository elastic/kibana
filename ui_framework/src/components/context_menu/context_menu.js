import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiContextMenuPanel } from './context_menu_panel';
import { KuiContextMenuItem } from './context_menu_item';

export class KuiContextMenu extends Component {
  static propTypes = {
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
    // We have to store explicit references to each click handler because we want to call it directly
    // when the user hits the right arrow key, instead of calling `click()` on the element.
    // If we call `click()` on the element, the tests fail.
    this.menuItemClickHandlers = [];
    this.itemIndexToPanelIdMap = {};

    this.state = {
      outGoingPanelId: undefined,
      currentPanelId: props.initialPanelId,
      transitionDirection: undefined,
      isTransitioning: false,
    };
  }

  hasPreviousPanel = panelId => {
    const previousPanelId = this.props.idToPreviousPanelIdMap[panelId];
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
        transitionDirection: undefined,
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
      const previousPanelId = this.props.idToPreviousPanelIdMap[this.state.currentPanelId];
      this.showPanel(previousPanelId, 'previous');
    }
  };

  updateHeight() {
    const height = this.currentPanel.clientHeight;
    this.menu.setAttribute('style', `height: ${height}px`);
  }

  componentWillReceiveProps(nextProps) {
    // If the user is opening the context menu, reset the state.
    if (nextProps.isVisible && !this.props.isVisible) {
      this.setState({
        outGoingPanelId: undefined,
        currentPanelId: nextProps.initialPanelId,
        transitionDirection: undefined,
      });
    }
  }

  componentDidMount() {
    this.updateHeight();
  }

  componentDidUpdate() {
    // Make sure we don't steal focus while the ContextMenu is closed.
    if (!this.props.isVisible) {
      return;
    }

    if (this.state.isTransitioning) {
      this.updateHeight();
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
    const panel = this.props.idToPanelMap[panelId];

    if (!panel) {
      return;
    }

    if (transitionType === 'in') {
      this.itemIndexToPanelIdMap = {};

      if (panel.items) {
        panel.items.forEach((item, index) => {
          if (item.panel) {
            this.itemIndexToPanelIdMap[index] = item.panel.id;
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
        className="kuiContextMenu__panel"
        panelRef={node => {
          if (transitionType === 'in') {
            this.currentPanel = node;
          }
        }}
        title={panel.title}
        onClose={onClose}
        transitionType={transitionType}
        transitionDirection={this.state.transitionDirection}
        isTransitioning={this.state.isTransitioning}
        isActive={transitionType === 'in'}
        items={this.renderItems(panel.items)}
        showNextPanel={this.showNextPanel}
        showPreviousPanel={this.showPreviousPanel}
      >
        {panel.content}
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
        {...rest}
      >
        {outGoingPanel}
        {currentPanel}
      </div>
    );
  }
}
