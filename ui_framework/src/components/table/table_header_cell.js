import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableHeaderCell = ({
  children,
  onSort,
  isSorted,
  isSortAscending,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiTableHeaderCell', className);
  const linerClasses = classNames('kuiTableHeaderCell__liner', {
    'kuiTableHeaderCell__liner--sortable': onSort,
    'kuiTableHeaderCell__liner-isSorted': isSorted,
  });

  let liner;

  if (onSort) {
    let sortIcon;

    if (isSorted) {
      const sortIconClasses = classNames('kuiTableSortIcon kuiIcon', {
        'fa-long-arrow-up': isSortAscending,
        'fa-long-arrow-down': !isSortAscending,
      });

      sortIcon = <span className={sortIconClasses} />;
    }

    liner = (
      <button
        className={linerClasses}
        onClick={onSort}
      >
        {children}
        {sortIcon}
      </button>
    );
  } else {
    liner = (
      <div className={linerClasses}>
        {children}
      </div>
    );
  }

  return (
    <th
      className={classes}
      {...rest}
    >
      {liner}
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
