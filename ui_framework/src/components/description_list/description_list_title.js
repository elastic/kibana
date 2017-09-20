import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiDescriptionListTitle = ({
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiDescriptionList__title', className);

  return (
    <dt
      className={classes}
      {...rest}
    >
      {children}
    </dt>
  );
};

KuiDescriptionListTitle.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
