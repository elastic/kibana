import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';

import { cascadingMenuKeyCodes } from '../../services';

import { KuiOutsideClickDetector } from '../outside_click_detector';

import { KuiPanel, SIZES } from '../../components/panel/panel';

const anchorPositionToClassNameMap = {
  'upCenter': 'kuiPopover--anchorUpCenter',
  'upLeft': 'kuiPopover--anchorUpLeft',
  'upRight': 'kuiPopover--anchorUpRight',
  'downCenter': 'kuiPopover--anchorDownCenter',
  'downLeft': 'kuiPopover--anchorDownLeft',
  'downRight': 'kuiPopover--anchorDownRight',
  'leftCenter': 'kuiPopover--anchorLeftCenter',
  'leftUp': 'kuiPopover--anchorLeftUp',
  'leftDown': 'kuiPopover--anchorLeftDown',
  'rightCenter': 'kuiPopover--anchorRightCenter',
  'rightUp': 'kuiPopover--anchorRightUp',
  'rightDown': 'kuiPopover--anchorRightDown',
};

export const ANCHOR_POSITIONS = Object.keys(anchorPositionToClassNameMap);

export class KuiPopover extends Component {
  constructor(props) {
    super(props);

    this.closingTransitionTimeout = undefined;

    this.state = {
      isClosing: false,
      isOpening: false,
    };
  }

  onKeyDown = e => {
    if (e.keyCode === cascadingMenuKeyCodes.ESCAPE) {
      this.props.closePopover();
    }
  };

  componentWillReceiveProps(nextProps) {
    // The popover is being opened.
    if (!this.props.isOpen && nextProps.isOpen) {
      clearTimeout(this.closingTransitionTimeout);
      // We need to set this state a beat after the render takes place, so that the CSS
      // transition can take effect.
      window.requestAnimationFrame(() => {
        this.setState({
          isOpening: true,
        });
      });
    }

    // The popover is being closed.
    if (this.props.isOpen && !nextProps.isOpen) {
      // If the user has just closed the popover, queue up the removal of the content after the
      // transition is complete.
      this.setState({
        isClosing: true,
        isOpening: false,
      });

      this.closingTransitionTimeout = setTimeout(() => {
        this.setState({
          isClosing: false,
        });
      }, 250);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.closingTransitionTimeout);
  }

  render() {
    const {
      anchorPosition,
      button,
      isOpen,
      withTitle,
      children,
      className,
      closePopover,
      panelClassName,
      panelPaddingSize,
      ...rest,
    } = this.props;

    const classes = classNames(
      'kuiPopover',
      anchorPositionToClassNameMap[anchorPosition],
      className,
      {
        'kuiPopover-isOpen': this.state.isOpening,
        'kuiPopover--withTitle': withTitle,
      },
    );

    const panelClasses = classNames('kuiPopover__panel', panelClassName);

    let panel;

    if (isOpen || this.state.isClosing) {
      panel = (
        <FocusTrap
          focusTrapOptions={{
            clickOutsideDeactivates: true,
            fallbackFocus: () => this.panel,
          }}
        >
          <KuiPanel
            panelRef={node => { this.panel = node; }}
            className={panelClasses}
            paddingSize={panelPaddingSize}
            hasShadow
          >
            {children}
          </KuiPanel>
        </FocusTrap>
      );
    }

    return (
      <KuiOutsideClickDetector onOutsideClick={closePopover}>
        <div
          className={classes}
          onKeyDown={this.onKeyDown}
          {...rest}
        >
          {button}
          {panel}
        </div>
      </KuiOutsideClickDetector>
    );
  }
}

KuiPopover.propTypes = {
  isOpen: PropTypes.bool,
  withTitle: PropTypes.bool,
  closePopover: PropTypes.func.isRequired,
  button: PropTypes.node.isRequired,
  children: PropTypes.node,
  anchorPosition: PropTypes.oneOf(ANCHOR_POSITIONS),
  panelClassName: PropTypes.string,
  panelPaddingSize: PropTypes.oneOf(SIZES),
};

KuiPopover.defaultProps = {
  isOpen: false,
  anchorPosition: 'downCenter',
  panelPaddingSize: 'm',
};
