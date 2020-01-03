/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonIcon,
  EuiContextMenu,
  EuiToolTip,
  EuiContextMenuPanelItemDescriptor,
  EuiContextMenuPanelDescriptor,
  EuiOverlayMask,
} from '@elastic/eui';
import { Popover } from '../popover';
import { CustomElementModal } from '../custom_element_modal';
import { ToolTipShortcut } from '../tool_tip_shortcut/';
import { ComponentStrings } from '../../../i18n/components';
import { ShortcutStrings } from '../../../i18n/shortcuts';

const topBorderClassName = 'canvasContextMenu--topBorder';

const { SidebarHeader: strings } = ComponentStrings;
const shortcutHelp = ShortcutStrings.getShortcutHelp();

interface Props {
  /**
   * title to display in the header
   */
  title: string;
  /**
   * indicated whether or not layer controls should be displayed
   */
  showLayerControls?: boolean;
  /**
   * cuts selected elements
   */
  cutNodes: () => void;
  /**
   * copies selected elements to clipboard
   */
  copyNodes: () => void;
  /**
   * pastes elements stored in clipboard to page
   */
  pasteNodes: () => void;
  /**
   * clones selected elements
   */
  cloneNodes: () => void;
  /**
   * deletes selected elements
   */
  deleteNodes: () => void;
  /**
   * moves selected element to top layer
   */
  bringToFront: () => void;
  /**
   * moves selected element up one layer
   */
  bringForward: () => void;
  /**
   * moves selected element down one layer
   */
  sendBackward: () => void;
  /**
   * moves selected element to bottom layer
   */
  sendToBack: () => void;
  /**
   * saves the selected elements as an custom-element saved object
   */
  createCustomElement: (name: string, description: string, image: string) => void;
  /**
   * indicated whether the selected element is a group or not
   */
  groupIsSelected: boolean;
  /**
   * only more than one selected element can be grouped
   */
  selectedNodes: string[];
  /**
   * groups selected elements
   */
  groupNodes: () => void;
  /**
   * ungroups selected group
   */
  ungroupNodes: () => void;
  /**
   * left align selected elements
   */
  alignLeft: () => void;
  /**
   * center align selected elements
   */
  alignCenter: () => void;
  /**
   * right align selected elements
   */
  alignRight: () => void;
  /**
   * top align selected elements
   */
  alignTop: () => void;
  /**
   * middle align selected elements
   */
  alignMiddle: () => void;
  /**
   * bottom align selected elements
   */
  alignBottom: () => void;
  /**
   * horizontally distribute selected elements
   */
  distributeHorizontally: () => void;
  /**
   * vertically distribute selected elements
   */
  distributeVertically: () => void;
}

interface State {
  /**
   *  indicates whether or not the custom element modal is open
   */
  isModalVisible: boolean;
}

interface MenuTuple {
  menuItem: EuiContextMenuPanelItemDescriptor;
  panel: EuiContextMenuPanelDescriptor;
}

const contextMenuButton = (handleClick: React.MouseEventHandler<HTMLButtonElement>) => (
  <EuiButtonIcon
    color="text"
    iconType="boxesVertical"
    onClick={handleClick}
    aria-label={strings.getContextMenuTitle()}
  />
);

export class SidebarHeader extends Component<Props, State> {
  public static propTypes = {
    title: PropTypes.string.isRequired,
    showLayerControls: PropTypes.bool, // TODO: remove when we support relayering multiple elements
    cutNodes: PropTypes.func.isRequired,
    copyNodes: PropTypes.func.isRequired,
    pasteNodes: PropTypes.func.isRequired,
    cloneNodes: PropTypes.func.isRequired,
    deleteNodes: PropTypes.func.isRequired,
    bringToFront: PropTypes.func.isRequired,
    bringForward: PropTypes.func.isRequired,
    sendBackward: PropTypes.func.isRequired,
    sendToBack: PropTypes.func.isRequired,
    createCustomElement: PropTypes.func.isRequired,
    groupIsSelected: PropTypes.bool,
    selectedNodes: PropTypes.array,
    groupNodes: PropTypes.func.isRequired,
    ungroupNodes: PropTypes.func.isRequired,
    alignLeft: PropTypes.func.isRequired,
    alignCenter: PropTypes.func.isRequired,
    alignRight: PropTypes.func.isRequired,
    alignTop: PropTypes.func.isRequired,
    alignMiddle: PropTypes.func.isRequired,
    alignBottom: PropTypes.func.isRequired,
    distributeHorizontally: PropTypes.func.isRequired,
    distributeVertically: PropTypes.func.isRequired,
  };

  public static defaultProps = {
    groupIsSelected: false,
    showLayerControls: false,
    selectedNodes: [],
  };

  public state = {
    isModalVisible: false,
  };

  private _isMounted = false;
  private _showModal = () => this._isMounted && this.setState({ isModalVisible: true });
  private _hideModal = () => this._isMounted && this.setState({ isModalVisible: false });

  public componentDidMount() {
    this._isMounted = true;
  }

  public componentWillUnmount() {
    this._isMounted = false;
  }

  private _renderLayoutControls = () => {
    const { bringToFront, bringForward, sendBackward, sendToBack } = this.props;
    return (
      <Fragment>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="bottom"
            content={
              <span>
                {shortcutHelp.BRING_TO_FRONT}
                <ToolTipShortcut namespace="ELEMENT" action="BRING_TO_FRONT" />
              </span>
            }
          >
            <EuiButtonIcon
              color="text"
              iconType="sortUp"
              onClick={bringToFront}
              aria-label={strings.getBringToFrontAriaLabel()}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="bottom"
            content={
              <span>
                {shortcutHelp.BRING_FORWARD}
                <ToolTipShortcut namespace="ELEMENT" action="BRING_FORWARD" />
              </span>
            }
          >
            <EuiButtonIcon
              color="text"
              iconType="arrowUp"
              onClick={bringForward}
              aria-label={strings.getBringForwardAriaLabel()}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="bottom"
            content={
              <span>
                {shortcutHelp.SEND_BACKWARD}
                <ToolTipShortcut namespace="ELEMENT" action="SEND_BACKWARD" />
              </span>
            }
          >
            <EuiButtonIcon
              color="text"
              iconType="arrowDown"
              onClick={sendBackward}
              aria-label={strings.getSendBackwardAriaLabel()}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="bottom"
            content={
              <span>
                {shortcutHelp.SEND_TO_BACK}
                <ToolTipShortcut namespace="ELEMENT" action="SEND_TO_BACK" />
              </span>
            }
          >
            <EuiButtonIcon
              color="text"
              iconType="sortDown"
              onClick={sendToBack}
              aria-label={strings.getSendToBackAriaLabel()}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </Fragment>
    );
  };

  private _getLayerMenuItems = (): MenuTuple => {
    const { bringToFront, bringForward, sendBackward, sendToBack } = this.props;

    return {
      menuItem: { name: strings.getOrderMenuItemLabel(), className: topBorderClassName, panel: 1 },
      panel: {
        id: 1,
        title: strings.getOrderMenuItemLabel(),
        items: [
          {
            name: shortcutHelp.BRING_TO_FRONT, // TODO: check against current element position and disable if already top layer
            icon: 'sortUp',
            onClick: bringToFront,
          },
          {
            name: shortcutHelp.BRING_TO_FRONT, // TODO: same as above
            icon: 'arrowUp',
            onClick: bringForward,
          },
          {
            name: shortcutHelp.SEND_BACKWARD, // TODO: check against current element position and disable if already bottom layer
            icon: 'arrowDown',
            onClick: sendBackward,
          },
          {
            name: shortcutHelp.SEND_TO_BACK, // TODO: same as above
            icon: 'sortDown',
            onClick: sendToBack,
          },
        ],
      },
    };
  };

  private _getAlignmentMenuItems = (close: (fn: () => void) => () => void): MenuTuple => {
    const { alignLeft, alignCenter, alignRight, alignTop, alignMiddle, alignBottom } = this.props;

    return {
      menuItem: {
        name: strings.getAlignmentMenuItemLabel(),
        className: 'canvasContextMenu',
        panel: 2,
      },
      panel: {
        id: 2,
        title: strings.getAlignmentMenuItemLabel(),
        items: [
          {
            name: strings.getLeftAlignMenuItemLabel(),
            icon: 'editorItemAlignLeft',
            onClick: close(alignLeft),
          },
          {
            name: strings.getCenterAlignMenuItemLabel(),
            icon: 'editorItemAlignCenter',
            onClick: close(alignCenter),
          },
          {
            name: strings.getRightAlignMenuItemLabel(),
            icon: 'editorItemAlignRight',
            onClick: close(alignRight),
          },
          {
            name: strings.getTopAlignMenuItemLabel(),
            icon: 'editorItemAlignTop',
            onClick: close(alignTop),
          },
          {
            name: strings.getMiddleAlignMenuItemLabel(),
            icon: 'editorItemAlignMiddle',
            onClick: close(alignMiddle),
          },
          {
            name: strings.getBottomAlignMenuItemLabel(),
            icon: 'editorItemAlignBottom',
            onClick: close(alignBottom),
          },
        ],
      },
    };
  };

  private _getDistributionMenuItems = (close: (fn: () => void) => () => void): MenuTuple => {
    const { distributeHorizontally, distributeVertically } = this.props;

    return {
      menuItem: {
        name: strings.getDistributionMenuItemLabel(),
        className: 'canvasContextMenu',
        panel: 3,
      },
      panel: {
        id: 3,
        title: strings.getDistributionMenuItemLabel(),
        items: [
          {
            name: strings.getHorizontalDistributionMenuItemLabel(),
            icon: 'editorDistributeHorizontal',
            onClick: close(distributeHorizontally),
          },
          {
            name: strings.getVerticalDistributionMenuItemLabel(),
            icon: 'editorDistributeVertical',
            onClick: close(distributeVertically),
          },
        ],
      },
    };
  };

  private _getGroupMenuItems = (
    close: (fn: () => void) => () => void
  ): EuiContextMenuPanelItemDescriptor[] => {
    const { groupIsSelected, ungroupNodes, groupNodes, selectedNodes } = this.props;
    return groupIsSelected
      ? [
          {
            name: strings.getUngroupMenuItemLabel(),
            className: topBorderClassName,
            onClick: close(ungroupNodes),
          },
        ]
      : selectedNodes.length > 1
      ? [
          {
            name: strings.getGroupMenuItemLabel(),
            className: topBorderClassName,
            onClick: close(groupNodes),
          },
        ]
      : [];
  };

  private _getPanels = (closePopover: () => void): EuiContextMenuPanelDescriptor[] => {
    const {
      showLayerControls,
      cutNodes,
      copyNodes,
      pasteNodes,
      deleteNodes,
      cloneNodes,
    } = this.props;

    // closes popover after invoking fn
    const close = (fn: () => void) => () => {
      fn();
      closePopover();
    };

    const items: EuiContextMenuPanelItemDescriptor[] = [
      {
        name: shortcutHelp.CUT,
        icon: 'cut',
        onClick: close(cutNodes),
      },
      {
        name: shortcutHelp.COPY,
        icon: 'copy',
        onClick: copyNodes,
      },
      {
        name: shortcutHelp.PASTE, // TODO: can this be disabled if clipboard is empty?
        icon: 'copyClipboard',
        onClick: close(pasteNodes),
      },
      {
        name: shortcutHelp.DELETE,
        icon: 'trash',
        onClick: close(deleteNodes),
      },
      {
        name: shortcutHelp.CLONE,
        onClick: close(cloneNodes),
      },
      ...this._getGroupMenuItems(close),
    ];

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: strings.getContextMenuTitle(),
        items,
      },
    ];

    const fillMenu = ({ menuItem, panel }: MenuTuple) => {
      items.push(menuItem); // add Order menu item to first panel
      panels.push(panel); // add nested panel for layers controls
    };

    if (showLayerControls) {
      fillMenu(this._getLayerMenuItems());
    }

    if (this.props.selectedNodes.length > 1) {
      fillMenu(this._getAlignmentMenuItems(close));
    }

    if (this.props.selectedNodes.length > 2) {
      fillMenu(this._getDistributionMenuItems(close));
    }

    items.push({
      name: strings.getSaveElementMenuItemLabel(),
      icon: 'indexOpen',
      className: topBorderClassName,
      onClick: this._showModal,
    });

    return panels;
  };

  private _renderContextMenu = () => (
    <Popover
      id="sidebar-context-menu-popover"
      className="canvasContextMenu"
      button={contextMenuButton}
      panelPaddingSize="none"
      tooltip={strings.getContextMenuTitle()}
      tooltipPosition="bottom"
    >
      {({ closePopover }: { closePopover: () => void }) => (
        <EuiContextMenu initialPanelId={0} panels={this._getPanels(closePopover)} />
      )}
    </Popover>
  );

  private _handleSave = (name: string, description: string, image: string) => {
    const { createCustomElement } = this.props;
    createCustomElement(name, description, image);
    this._hideModal();
  };

  render() {
    const { title, showLayerControls } = this.props;
    const { isModalVisible } = this.state;

    return (
      <Fragment>
        <EuiFlexGroup
          className="canvasLayout__sidebarHeader"
          gutterSize="none"
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              {showLayerControls ? this._renderLayoutControls() : null}
              <EuiFlexItem grow={false}>
                <EuiToolTip position="bottom" content={strings.getSaveElementMenuItemLabel()}>
                  <EuiButtonIcon
                    color="text"
                    iconType="indexOpen"
                    onClick={this._showModal}
                    aria-label={strings.getSaveElementMenuItemLabel()}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{this._renderContextMenu()}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isModalVisible ? (
          <EuiOverlayMask>
            <CustomElementModal
              title={strings.getCreateElementModalTitle()}
              onSave={this._handleSave}
              onCancel={this._hideModal}
            />
          </EuiOverlayMask>
        ) : null}
      </Fragment>
    );
  }
}
