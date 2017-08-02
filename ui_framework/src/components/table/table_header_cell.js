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

export const KuiTableHeaderCell = ({
  align,
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiTableHeaderCell', className, {
    'kuiTableHeaderCell--alignRight': align === RIGHT_ALIGNMENT,
  });

  return (
    <th
      className={classes}
      {...rest}
    >
      {children}
    </th>
  );
};

KuiTableHeaderCell.propTypes = {
  align: PropTypes.oneOf(ALIGNMENT),
  children: PropTypes.node,
  className: PropTypes.string,
};

KuiTableHeaderCell.defaultProps = {
  align: LEFT_ALIGNMENT,
};
