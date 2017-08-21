import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiHorizontalRule = ({
  className,
  ...rest,
}) => {
  const classes = classNames('kuiHorizontalRule', className);

  return (
    <hr
      className={classes}
      {...rest}
    />
  );
};

KuiHorizontalRule.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
