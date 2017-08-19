import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const gutterSizeToClassNameMap = {
  none: '',
  small: 'kuiFlexGroup--gutterSmall',
  medium: 'kuiFlexGroup--gutterMedium',
  large: 'kuiFlexGroup--gutterLarge',
  extraLarge: 'kuiFlexGroup--gutterExtraLarge',
};

export const GUTTER_SIZES = Object.keys(gutterSizeToClassNameMap);

const alignItemsToClassNameMap = {
  stretch: '',
  flexStart: 'kuiFlexGroup--alignItemsFlexStart',
  flexEnd: 'kuiFlexGroup--alignItemsFlexEnd',
  center: 'kuiFlexGroup--alignItemsFlexCenter',
};

export const ALIGN_ITEMS = Object.keys(alignItemsToClassNameMap);

const justifyContentToClassNameMap = {
  flexStart: '',
  flexEnd: 'kuiFlexGroup--justifyContentFlexEnd',
  center: 'kuiFlexGroup--justifyContentCenter',
  spaceBetween: 'kuiFlexGroup--justifyContentSpaceBetween',
  spaceAround: 'kuiFlexGroup--justifyContentSpaceAround',
};

export const JUSTIFIED_CONTENTS = Object.keys(alignItemsToClassNameMap);

const wrapGridToClassNameMap = {
  2: 'kuiFlexGroup--flexBasisHalves',
  3: 'kuiFlexGroup--flexBasisThirds',
  4: 'kuiFlexGroup--flexBasisFourths',
};

export const WRAP_GRIDS = Object.keys(wrapGridToClassNameMap);

export const KuiFlexGroup = ({ children, className, gutterSize, alignItems, justifyContent, wrapGridOf, growItems, ...rest }) => {
  const classes = classNames(
    'kuiFlexGroup',
    gutterSizeToClassNameMap[gutterSize],
    alignItemsToClassNameMap[alignItems],
    justifyContentToClassNameMap[justifyContent],
    wrapGridToClassNameMap[wrapGridOf],
    {
      'kuiFlexGroup--flexGrowZero': !growItems,
    },
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

KuiFlexGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  gutterSize: PropTypes.string,
  alignItems: PropTypes.string,
  justifyContent: PropTypes.string,
  columns: PropTypes.number,
  growItems: PropTypes.bool,
};

KuiFlexGroup.defaultProps = {
  gutterSize: 'large',
  alignItems: 'stretch',
  justifyContent: 'flex-start',
  wrapGridOf: null,
  growItems: true,
};
