import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiOutsideClickDetector } from '../outside_click_detector';

const anchorPositionToClassNameMap = {
  'center': '',
  'left': 'kuiPopover--anchorLeft',
  'right': 'kuiPopover--anchorRight',
};

export const ANCHOR_POSITIONS = Object.keys(anchorPositionToClassNameMap);

export const KuiPopover = ({
  anchorPosition,
  bodyClassName,
  button,
  isOpen,
  children,
  className,
  closePopover,
  ...rest,
}) => {
  const classes = classNames(
    'kuiPopover',
    anchorPositionToClassNameMap[anchorPosition],
    className,
    {
      'kuiPopover-isOpen': isOpen,
    },
  );

  const bodyClasses = classNames('kuiPopover__body', bodyClassName);

  const body = (
    <div className={bodyClasses}>
      { children }
    </div>
  );

  return (
    <KuiOutsideClickDetector onOutsideClick={closePopover}>
      <div
        className={classes}
        {...rest}
      >
        { button }
        { body }
      </div>
    </KuiOutsideClickDetector>
  );
};

KuiPopover.propTypes = {
  isOpen: PropTypes.bool,
  closePopover: PropTypes.func.isRequired,
  button: PropTypes.node.isRequired,
  children: PropTypes.node,
  anchorPosition: PropTypes.oneOf(ANCHOR_POSITIONS),
  bodyClassName: PropTypes.string,
};

KuiPopover.defaultProps = {
  isOpen: false,
  anchorPosition: 'center',
};
