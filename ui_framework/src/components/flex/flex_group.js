import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const gutterSizeToClassNameMap = {
  none: '',
  small: 'kuiFlexGroup--gutterSmall',
  medium: 'kuiFlexGroup--gutterMedium',
  large: 'kuiFlexGroup--gutterLarge',
  extraLarge: 'kuiFlexGroup--gutterXLarge',
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

export const JUSTIFY_CONTENTS = Object.keys(justifyContentToClassNameMap);

export const KuiFlexGroup = ({ children, className, gutterSize, alignItems, justifyContent, growItems, ...rest }) => {
  const classes = classNames(
    'kuiFlexGroup',
    gutterSizeToClassNameMap[gutterSize],
    alignItemsToClassNameMap[alignItems],
    justifyContentToClassNameMap[justifyContent],
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
  gutterSize: PropTypes.oneOf(GUTTER_SIZES),
  alignItems: PropTypes.oneOf(ALIGN_ITEMS),
  justifyContent: PropTypes.oneOf(JUSTIFY_CONTENTS),
  growItems: PropTypes.bool,
};

KuiFlexGroup.defaultProps = {
  gutterSize: 'large',
  alignItems: 'stretch',
  justifyContent: 'flexStart',
  growItems: true,
};
