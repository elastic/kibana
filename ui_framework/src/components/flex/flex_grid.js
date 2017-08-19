import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const gutterSizeToClassNameMap = {
  none: '',
  small: 'kuiFlexGrid--gutterSmall',
  medium: 'kuiFlexGrid--gutterMedium',
  large: 'kuiFlexGrid--gutterLarge',
  extraLarge: 'kuiFlexGrid--gutterExtraLarge',
};

export const GUTTER_SIZES = Object.keys(gutterSizeToClassNameMap);

const columnsToClassNameMap = {
  2: 'kuiFlexGrid--flexBasisHalves',
  3: 'kuiFlexGrid--flexBasisThirds',
  4: 'kuiFlexGrid--flexBasisFourths',
};

export const COLUMNS = Object.keys(columnsToClassNameMap);

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
  columns: null,
};

