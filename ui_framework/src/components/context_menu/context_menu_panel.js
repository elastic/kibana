import React, {
  cloneElement,
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import tabbable from 'tabbable';

import { KuiPopoverTitle } from '../../components';
import { cascadingMenuKeyCodes } from '../../services';

const transitionDirectionAndTypeToClassNameMap = {
  next: {
    in: 'kuiContextMenuPanel-txInLeft',
    out: 'kuiContextMenuPanel-txOutLeft',
  },
  previous: {
    in: 'kuiContextMenuPanel-txInRight',
    out: 'kuiContextMenuPanel-txOutRight',
  },
};

export class KuiContextMenuPanel extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    title: PropTypes.string,
    onClose: PropTypes.func,
    panelRef: PropTypes.func,
    transitionType: PropTypes.oneOf(['in', 'out']),
    transitionDirection: PropTypes.oneOf(['next', 'previous']),
    isTransitioning: PropTypes.bool,
    isActive: PropTypes.bool,
    items: PropTypes.array,
    showNextPanel: PropTypes.func,
    showPreviousPanel: PropTypes.func,
    focusItemIndex: PropTypes.number,
  }

  static defaultProps = {
    isActive: true,
    items: [],
  }

  constructor(props) {
    super(props);

    this.menuItems = [];
  }

  state = {
    pressedArrowDirection: undefined,
  }

  onKeyDown = e => {
    // If this panel contains items you can use the left arrow key to go back at any time.
    // But if it doesn't contain items, then you have to focus on the back button specifically,
    // since there could be content inside the panel which requires use of the left arrow key,
    // e.g. text inputs.
    if (this.props.items.length || document.activeElement === this.backButton) {
      if (e.keyCode === cascadingMenuKeyCodes.LEFT) {
        if (this.props.showPreviousPanel) {
          this.props.showPreviousPanel();
        }
      }
    }

    if (this.props.items.length) {
      switch (e.keyCode) {
        case cascadingMenuKeyCodes.TAB:
          // Normal tabbing doesn't work within panels with items.
          e.preventDefault();
          break;

        case cascadingMenuKeyCodes.UP:
          e.preventDefault();
          this.setState({ pressedArrowDirection: 'up' });
          break;

        case cascadingMenuKeyCodes.DOWN:
          e.preventDefault();
          this.setState({ pressedArrowDirection: 'down' });
          break;

        case cascadingMenuKeyCodes.RIGHT:
          if (this.props.showNextPanel) {
            this.props.showNextPanel(this.getFocusedMenuItemIndex());
          }
          break;

        default:
          break;
      }
    }
  };

  isMenuItemFocused() {
    const indexOfActiveElement = this.menuItems.indexOf(document.activeElement);
    return indexOfActiveElement !== -1;
  }

  getFocusedMenuItemIndex() {
    return this.menuItems.indexOf(document.activeElement);
  }

  updateFocusedMenuItem() {
    // If this panel isn't active, don't focus any items.
    if (!this.props.isActive) {
      if (this.isMenuItemFocused()) {
        document.activeElement.blur();
      }
      return;
    }

    // Setting focus while transitioning causes the animation to glitch, so we have to wait
    // until it's finished before we focus anything.
    if (this.props.isTransitioning) {
      return;
    }

    // If we're active, but nothing is focused then we should focus the first item.
    if (!this.isMenuItemFocused()) {
      if (this.props.focusItemIndex !== undefined) {
        this.menuItems[this.props.focusItemIndex].focus();
        return;
      }

      if (this.menuItems.length !== 0) {
        this.menuItems[0].focus();
        return;
      }

      // Focus first tabbable item.
      const tabbableItems = tabbable(this.panel);
      if (tabbableItems.length) {
        tabbableItems[0].focus();
      }
      return;
    }

    // Update focused state based on arrow key navigation.
    if (this.state.pressedArrowDirection) {
      const indexOfActiveElement = this.getFocusedMenuItemIndex();
      let nextFocusedMenuItemIndex;

      switch (this.state.pressedArrowDirection) {
        case 'up':
          nextFocusedMenuItemIndex =
            (indexOfActiveElement - 1) !== -1
            ? indexOfActiveElement - 1
            : this.menuItems.length - 1;
          break;

        case 'down':
          nextFocusedMenuItemIndex =
            (indexOfActiveElement + 1) !== this.menuItems.length
            ? indexOfActiveElement + 1
            : 0;
          break;

        default:
          break;
      }

      this.menuItems[nextFocusedMenuItemIndex].focus();
      this.setState({ pressedArrowDirection: undefined });
    }
  }

  componentWillReceiveProps(nextProps) {
    // Clear refs to menuItems if we're getting new ones.
    if (this.props.items !== nextProps.items) {
      this.menuItems = [];
    }
  }

  componentDidMount() {
    this.updateFocusedMenuItem();
  }

  componentDidUpdate() {
    this.updateFocusedMenuItem();
  }

  menuItemRef = (index, node) => {
    // There's a weird bug where if you navigate to a panel without items, then this callback
    // is still invoked, so we have to do a truthiness check.
    if (node) {
      // Store all menu items.
      this.menuItems[index] = node;
    }
  };

  render() {
    const {
      children,
      className,
      onClose,
      title,
      panelRef,
      transitionType,
      transitionDirection,
      isTransitioning,
      isActive, // eslint-disable-line no-unused-vars
      items,
      focusItemIndex, // eslint-disable-line no-unused-vars
      showNextPanel, // eslint-disable-line no-unused-vars
      showPreviousPanel, // eslint-disable-line no-unused-vars
      ...rest,
    } = this.props;
    let panelTitle;

    if (title) {
      if (Boolean(onClose)) {
        panelTitle = (
          <button
            className="kuiContextMenuPanelTitle"
            onClick={onClose}
            ref={node => { this.backButton = node; }}
            data-test-subj="contextMenuPanelTitleButton"
          >
            <span className="kuiContextMenu__itemLayout">
              <span className="kuiContextMenu__icon kuiIcon fa-angle-left" />
              <span className="kuiContextMenu__text">
                {title}
              </span>
            </span>
          </button>
        );
      } else {
        panelTitle = (
          <KuiPopoverTitle>
            <span className="kuiContextMenu__itemLayout">
              {title}
            </span>
          </KuiPopoverTitle>
        );
      }
    }

    const classes = classNames('kuiContextMenuPanel', className, (
      isTransitioning && transitionDirectionAndTypeToClassNameMap[transitionDirection]
      ? transitionDirectionAndTypeToClassNameMap[transitionDirection][transitionType]
      : ''
    ));

    const content = items.length
      ? items.map((MenuItem, index) => cloneElement(MenuItem, {
        buttonRef: this.menuItemRef.bind(this, index),
      }))
      : children;

    return (
      <div
        ref={node => {
          this.panel = node;
          if (panelRef) panelRef(node);
        }}
        className={classes}
        onKeyDown={this.onKeyDown}
        {...rest}
      >
        {panelTitle}
        {content}
      </div>
    );
  }
}
