import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '../../services';

const ALIGNMENT = [
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
];

export const KuiTableRowCell = ({
  align,
  children,
  className,
  wrapText,
  ...rest,
}) => {
  const classes = classNames('kuiTableRowCell', className, {
    'kuiTableRowCell--alignRight': align === RIGHT_ALIGNMENT,
    'kuiTableRowCell--wrapText': wrapText,
  });

  return (
    <td className={classes} {...rest} >
      <div className="kuiTableRowCell__content">
        {children}
      </div>
    </td>
  );
};

KuiTableRowCell.propTypes = {
  align: PropTypes.oneOf(ALIGNMENT),
  wrapText: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};

KuiTableRowCell.defaultProps = {
  align: LEFT_ALIGNMENT,
};
