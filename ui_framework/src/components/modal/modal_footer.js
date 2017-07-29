import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

export function KuiModalFooter({ className, children, ...rest }) {
  const classes = classnames('kuiModalFooter', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalFooter.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
