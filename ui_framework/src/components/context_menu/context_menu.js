import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiContextMenuPanel } from './context_menu_panel';
import { KuiContextMenuItem } from './context_menu_item';

export class KuiContextMenu extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    initialPanelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    idToPanelMap: PropTypes.object,
    idToPreviousPanelIdMap: PropTypes.object,
  }

  static defaultProps = {
    idToPanelMap: {},
    idToPreviousPanelIdMap: {},
  }

  constructor(props) {
    super(props);

    this.resetTransitionId = undefined;

    this.state = {
      outGoingPanelId: undefined,
      currentPanelId: props.initialPanelId,
      transitionDirection: undefined,
    };
  }

  showPanel(panelId, direction) {
    clearTimeout(this.resetTransitionId);

    this.setState({
      outGoingPanelId: this.state.currentPanelId,
      currentPanelId: panelId,
      transitionDirection: direction,
    });

    // Queue the transition to reset.
    this.resetTransitionId = setTimeout(() => {
      this.setState({
        transitionDirection: undefined,
      });
    }, 250);
  }

  updateHeight() {
    const height = this.currentPanel.clientHeight;
    this.menu.setAttribute('style', `height: ${height}px`);
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
        onClick = this.showPanel.bind(this, item.panel.id, 'next');
      }

      return (
        <KuiContextMenuItem
          key={item.name}
          icon={item.icon}
          onClick={onClick}
          hasPanel={Boolean(item.panel)}
        >
          {item.name}
        </KuiContextMenuItem>
      );
    });

    const previousPanelId = this.props.idToPreviousPanelIdMap[panelId];

    let onClose;

    if (typeof previousPanelId === 'number') {
      onClose = this.showPanel.bind(this, previousPanelId, 'previous');
    }

    return (
      <KuiContextMenuPanel
        panelRef={node => { this.currentPanel = node; }}
        title={panel.title}
        onClose={onClose}
        transitionType={transitionType}
        transitionDirection={this.state.transitionDirection}
      >
        {panel.content || renderItems(panel.items)}
      </KuiContextMenuPanel>
    );
  }

  componentDidMount() {
    this.updateHeight();
  }

  componentDidUpdate() {
    this.updateHeight();
  }

  render() {
    const {
      idToPanelMap, // eslint-disable-line no-unused-vars
      idToPreviousPanelIdMap, // eslint-disable-line no-unused-vars
      className,
      initialPanelId, // eslint-disable-line no-unused-vars
      ...rest,
    } = this.props;

    const currentPanel = this.renderPanel(this.state.currentPanelId, 'in');
    const outGoingPanel = this.renderPanel(this.state.outGoingPanelId, 'out');

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
