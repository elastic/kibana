import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

export function KuiModalOverlay({ className,  ...rest }) {
  const classes = classnames('kuiModalOverlay', className);
  return (
    <div
      className={ classes }
      { ...rest}
    />
  );
}

KuiModalOverlay.propTypes = {
  className: PropTypes.string,
};
