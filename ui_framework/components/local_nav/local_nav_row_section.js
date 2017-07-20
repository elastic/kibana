import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

export function KuiLocalNavRowSection({ className, children, ...rest }) {
  const classes = classnames('kuiLocalNavRow__section', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiLocalNavRowSection.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
