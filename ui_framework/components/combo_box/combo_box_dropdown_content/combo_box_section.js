import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiComboBoxSection = ({
  children,
  className,
   ...rest,
}) => {
  const classes = classNames('kuiComboBoxSection', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiComboBoxSection.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
