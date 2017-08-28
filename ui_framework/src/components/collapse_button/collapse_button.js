import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

const DIRECTIONS = [
  'down',
  'up',
  'left',
  'right'
];

const directionToClassNameMap = {
  down: 'fa-chevron-circle-down',
  up: 'fa-chevron-circle-up',
  left: 'fa-chevron-circle-left',
  right: 'fa-chevron-circle-right',
};

const KuiCollapseButton = ({ className, direction, ...rest }) => {
  const classes = classNames('kuiCollapseButton', className);
  const childClasses = classNames('kuiIcon', directionToClassNameMap[direction]);

  return (
    <button
      type="button"
      className={classes}
      {...rest}
    >
      <span className={childClasses} />
    </button>
  );
};

KuiCollapseButton.propTypes = {
  className: PropTypes.string,
  direction: PropTypes.oneOf(DIRECTIONS).isRequired
};

export {
  DIRECTIONS,
  KuiCollapseButton
};
