import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiDescriptionListDescription = ({
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiDescriptionList__description', className);

  return (
    <dd
      className={classes}
      {...rest}
    >
      {children}
    </dd>
  );
};

KuiDescriptionListDescription.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
