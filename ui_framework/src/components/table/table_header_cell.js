import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiIcon,
} from '../../components';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '../../services';

const ALIGNMENT = [
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
];

export const KuiTableHeaderCell = ({
  children,
  align,
  onSort,
  isSorted,
  isSortAscending,
  className,
  ariaLabel,
  ...rest,
}) => {
  const classes = classNames('kuiTableHeaderCell', className);

  const contentClasses = classNames('kuiTableCellContent', className, {
    'kuiTableCellContent--alignRight': align === RIGHT_ALIGNMENT,
  });

  if (onSort) {
    const sortIcon = (
      <KuiIcon
        className="kuiTableSortIcon"
        type={isSortAscending ? 'sortUp' : 'sortDown'}
        size="medium"
      />
    );

    const buttonClasses = classNames('kuiTableHeaderButton', {
      'kuiTableHeaderButton-isSorted': isSorted,
    });

    const columnTitle = ariaLabel ? ariaLabel : children;
    const statefulAriaLabel = `Sort ${columnTitle} ${isSortAscending ? 'descending' : 'ascending'}`;

    return (
      <th
        className={classes}
        {...rest}
      >
        <button
          className={buttonClasses}
          onClick={onSort}
          aria-label={statefulAriaLabel}
        >
          <span className={contentClasses}>
            {children}
            {sortIcon}
          </span>
        </button>
      </th>
    );
  }

  return (
    <th
      className={classes}
      aria-label={ariaLabel}
      {...rest}
    >
      <div className={contentClasses}>
        {children}
      </div>
    </th>
  );
};

KuiTableHeaderCell.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  align: PropTypes.oneOf(ALIGNMENT),
  onSort: PropTypes.func,
  isSorted: PropTypes.bool,
  isSortAscending: PropTypes.bool,
};

KuiTableHeaderCell.defaultProps = {
  align: LEFT_ALIGNMENT,
};
