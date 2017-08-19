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

const wrapGridToClassNameMap = {
  2: 'kuiFlexGrid--flexBasisHalves',
  3: 'kuiFlexGrid--flexBasisThirds',
  4: 'kuiFlexGrid--flexBasisFourths',
};

export const WRAP_GRIDS = Object.keys(wrapGridToClassNameMap);

export const KuiFlexGrid = ({ children, className, gutterSize, wrapGridOf, ...rest }) => {
  const classes = classNames(
    'kuiFlexGrid',
    gutterSizeToClassNameMap[gutterSize],
    wrapGridToClassNameMap[wrapGridOf],
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
  gutterSize: PropTypes.string,
  wrapGridOf: PropTypes.number,
};

KuiFlexGrid.defaultProps = {
  gutterSize: 'large',
  wrapGridOf: null,
};

