import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';

const KuiButtonGroup = props => {
  const classes = classNames('kuiButtonGroup', {
    'kuiButtonGroup--united': props.isUnited,
  });

  return (
    <div className={classes}>
      {props.children}
    </div>
  );
};

KuiButtonGroup.propTypes = {
  children: PropTypes.node,
  isUnited: PropTypes.bool,
};

export { KuiButtonGroup };
