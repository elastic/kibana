import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

export function KuiModalHeaderTitle({ className, children, ...rest }) {
  const classes = classnames('kuiModalHeader__title', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalHeaderTitle.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
