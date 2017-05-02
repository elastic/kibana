import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

export function KuiModal({ className, children, ...rest }) {
  const classes = classnames('kuiModal', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModal.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
