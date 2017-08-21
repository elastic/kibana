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

  let liner;

  if (onSort) {
    const sortIconClasses = classNames('kuiTableSortIcon kuiIcon', {
      'fa-long-arrow-up': isSortAscending,
      'fa-long-arrow-down': !isSortAscending,
    });

    const sortIcon = <span className={sortIconClasses} />;

    const buttonClasses = classNames('kuiTableHeaderCellButton', {
      'kuiTableHeaderCellButton-isSorted': isSorted,
    });

    liner = (
      <button
        className={buttonClasses}
        onClick={onSort}
      >
        <span className="kuiTableHeaderCell__liner">
          {children}
          {sortIcon}
        </span>
      </button>
    );
  } else {
    liner = (
      <div className="kuiTableHeaderCell__liner">
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
