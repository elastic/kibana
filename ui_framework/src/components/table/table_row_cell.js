import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { LEFT_ALIGNMENT, RIGHT_ALIGNMENT } from '../../services';
export const ALIGNMENT = [
  RIGHT_ALIGNMENT,
  LEFT_ALIGNMENT
];

export const KuiTableRowCell = ({
  children,
  align,
  className,
  textOnly,
  ...rest
}) => {
  const classes = classNames('kuiTableRowCell', className, {
    'kuiTableRowCell--alignRight': align === RIGHT_ALIGNMENT,
    'kuiTableRowCell--textOnly': textOnly,
  });

  return (
    <td className={classes} {...rest} >
      <div className="kuiTableRowCell__liner">
        {children}
      </div>
    </td>
  );
};
KuiTableRowCell.propTypes = {
  align: PropTypes.oneOf(ALIGNMENT),
  children: PropTypes.node,
  className: PropTypes.string,
  textOnly: PropTypes.bool,
};

KuiTableRowCell.defaultProps = {
  align: LEFT_ALIGNMENT,
  textOnly: true,
};
