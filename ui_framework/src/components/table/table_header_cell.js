import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { LEFT_ALIGNMENT, RIGHT_ALIGNMENT } from '../../services';

export const KuiTableHeaderCell = ({
  children,
  onSort,
  isSorted,
  isSortAscending,
  className,
  ariaLabel,
  align,
  scope,
  ...rest
}) => {
  const classes = classNames('kuiTableHeaderCell', className, {
    'kuiTableHeaderCell--alignRight': align === RIGHT_ALIGNMENT,
  });
  if (onSort) {
    const sortIconClasses = classNames('kuiTableSortIcon kuiIcon', {
      'fa-long-arrow-up': isSortAscending,
      'fa-long-arrow-down': !isSortAscending,
    });

    const sortIcon = <span className={sortIconClasses} aria-hidden="true" />;

    const buttonClasses = classNames('kuiTableHeaderCellButton', {
      'kuiTableHeaderCellButton-isSorted': isSorted,
    });

    const columnTitle = ariaLabel ? ariaLabel : children;
    const statefulAriaLabel = `Sort ${columnTitle} ${isSortAscending ? 'descending' : 'ascending'}`;

    return (
      <th
        className={classes}
        scope={scope}
        {...rest}
      >
        <button
          className={buttonClasses}
          onClick={onSort}
          aria-label={statefulAriaLabel}
        >
          <span className="kuiTableHeaderCell__liner">
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
      scope={scope}
      {...rest}
    >
      <div className="kuiTableHeaderCell__liner">
        {children}
      </div>
    </th>
  );
};

KuiTableHeaderCell.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  onSort: PropTypes.func,
  isSorted: PropTypes.bool,
  isSortAscending: PropTypes.bool,
  align: PropTypes.oneOf([LEFT_ALIGNMENT, RIGHT_ALIGNMENT]),
  scope: PropTypes.oneOf(['col', 'row', 'colgroup', 'rowgroup']),
};

KuiTableHeaderCell.defaultProps = {
  align: LEFT_ALIGNMENT,
  scope: 'col',
};
