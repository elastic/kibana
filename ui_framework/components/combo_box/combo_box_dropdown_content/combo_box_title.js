import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiComboBoxTitle = ({
  children,
  className,
   ...rest,
}) => {
  const classes = classNames('kuiComboBoxTitle', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiComboBoxTitle.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
