import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

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
  children,
  className,
  ...rest,
}) => {
  const classes = classNames(
    'kuiPopover',
    anchorPositionToClassNameMap[anchorPosition],
    isOpen ? 'isOpen' : undefined,
    className
  );

  const content =(
    <div className="kuiPopover__body kui--bottomShadow">
      {children}
    </div>
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {button}
      {content}
    </div>
  );
};

KuiPopover.propTypes = {
  isOpen: PropTypes.bool,
  button: PropTypes.node.isRequired,
  children: PropTypes.node,
  anchorPosition: PropTypes.oneOf(ANCHOR_POSITIONS),
};

KuiPopover.defaultProps = {
  isOpen: false,
  anchorPosition: 'center',
};
