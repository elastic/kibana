import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const DIRECTIONS = [
  'down',
  'up',
  'left',
  'right'
];

export const KuiCollapseButton = ({ className, direction, ...rest }) => {
  const classes = classNames('kuiCollapseButton', className);
  const childClasses = classNames('kuiIcon', `fa-chevron-circle-${direction}`);

  return (<button
            type="button"
            className={classes}
            {...rest}
          >
            <div className={childClasses}/>
          </button>);
};

KuiCollapseButton.propTypes = {
  className: PropTypes.string,
  direction: PropTypes.oneOf(DIRECTIONS).isRequired
};
