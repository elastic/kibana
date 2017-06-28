import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiComboBoxText = ({
  children,
  className,
   ...rest,
}) => {
  const classes = classNames('kuiComboBoxText', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiComboBoxText.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
