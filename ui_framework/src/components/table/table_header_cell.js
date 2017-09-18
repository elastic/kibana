import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableHeaderCell = ({
  children,
  onSort,
  isSorted,
  isSortAscending,
  className,
  ariaLabel,
  ...rest,
}) => {
  const classes = classNames('kuiTableHeaderCell', className);

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
};
