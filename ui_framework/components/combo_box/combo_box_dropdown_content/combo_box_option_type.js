import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiComboBoxOptionType = ({
  children,
  className,
   ...rest,
}) => {
  const classes = classNames('kuiComboBoxOption__type', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiComboBoxOptionType.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
