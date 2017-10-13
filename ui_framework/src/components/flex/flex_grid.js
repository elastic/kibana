import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const gutterSizeToClassNameMap = {
  none: '',
  small: 'kuiFlexGrid--gutterSmall',
  medium: 'kuiFlexGrid--gutterMedium',
  large: 'kuiFlexGrid--gutterLarge',
  extraLarge: 'kuiFlexGrid--gutterXLarge',
};

export const GUTTER_SIZES = Object.keys(gutterSizeToClassNameMap);

const columnsToClassNameMap = {
  0: 'kuiFlexGrid--wrap',
  2: 'kuiFlexGrid--halves',
  3: 'kuiFlexGrid--thirds',
  4: 'kuiFlexGrid--fourths',
};

export const COLUMNS = Object.keys(columnsToClassNameMap).map(columns => parseInt(columns, 10));

export const KuiFlexGrid = ({ children, className, gutterSize, columns, ...rest }) => {
  const classes = classNames(
    'kuiFlexGrid',
    gutterSizeToClassNameMap[gutterSize],
    columnsToClassNameMap[columns],
    className
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFlexGrid.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  gutterSize: PropTypes.oneOf(GUTTER_SIZES),
  columns: PropTypes.oneOf(COLUMNS).isRequired,
};

KuiFlexGrid.defaultProps = {
  gutterSize: 'large',
  columns: 0,
};

