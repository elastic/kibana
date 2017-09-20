import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableRowCellCheckbox = ({
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiTableRowCellCheckbox', className);

  return (
    <td className={classes} {...rest} >
      <div className="kuiTableCellContent">
        {children}
      </div>
    </td>
  );
};

KuiTableRowCellCheckbox.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
