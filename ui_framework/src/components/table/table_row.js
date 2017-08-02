import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableRow = ({ children, className, isSelected, ...rest }) => {
  const classes = classNames('kuiTableRow', className, {
    'kuiTableRow-isSelected': isSelected,
  });

  return (
    <tr
      className={classes}
      {...rest}
    >
      {children}
    </tr>
  );
};

KuiTableRow.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isSelected: PropTypes.bool,
};
