import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

export function KuiModalBodyText({ className, children, ...rest }) {
  const classes = classnames('kuiModalBodyText', className);
  return (
    <div className={ classes } { ...rest }>
      { children }
    </div>
  );
}

KuiModalBodyText.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
