import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableHeaderCellCheckbox = ({
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiTableHeaderCellCheckbox', className);

  return (
    <td className={classes} {...rest} >
      <div className="kuiTableCellContent">
        {children}
      </div>
    </td>
  );
};

KuiTableHeaderCellCheckbox.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
