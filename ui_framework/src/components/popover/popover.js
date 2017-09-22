import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiOutsideClickDetector } from '../outside_click_detector';

import { KuiPanel, SIZES } from '../../components/panel/panel';

const anchorPositionToClassNameMap = {
  'center': '',
  'left': 'kuiPopover--anchorLeft',
  'right': 'kuiPopover--anchorRight',
};

export const ANCHOR_POSITIONS = Object.keys(anchorPositionToClassNameMap);

export const KuiPopover = ({
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
}) => {
  const classes = classNames(
    'kuiPopover',
    anchorPositionToClassNameMap[anchorPosition],
    className,
    {
      'kuiPopover-isOpen': isOpen,
      'kuiPopover--withTitle': withTitle,
    },
  );

  const panelClasses = classNames('kuiPopover__panel', panelClassName);

  const panel = (
    <KuiPanel
      className={panelClasses}
      paddingSize={panelPaddingSize}
      hasShadow
    >
      { children }
    </KuiPanel>
  );

  // Make sure that we can't tab to the content of this Popover if it isn't open.
  const tabIndex = isOpen ? '0' : '-1';

  return (
    <KuiOutsideClickDetector onOutsideClick={closePopover}>
      <div
        className={classes}
        {...rest}
        tabIndex={tabIndex}
      >
        {button}
        {panel}
      </div>
    </KuiOutsideClickDetector>
  );
};

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
  anchorPosition: 'center',
  panelPaddingSize: 'm',
};
