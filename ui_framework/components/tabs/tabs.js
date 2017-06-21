import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiTab } from './tab';

export const KuiTabs = ({
  children,
  selectedTabIndex,
  onSelectedTabChanged,
  className,
  ...rest
}) => {
  const classes = classNames('kuiTabs', className);
  const tabs = children.map((child,index)=>(
    <KuiTab
      key={index}
      onClick={() => onSelectedTabChanged(index)}
      isSelected={index === selectedTabIndex}
    >
      {child}
    </KuiTab>
  ));

  return (
    <div
      className={classes}
      {...rest}
    >
      {tabs}
    </div>
  );
};

const selectedTabIndexCheck = (props, propName, componentName) => {
  const childrenLength = props.children ? props.children.length : 0;
  const selectedTabIndex = props.selectedTabIndex;

  // An undefined selected tab is OK in all situations.
  if (selectedTabIndex === undefined) {
    return;
  }

  if (childrenLength === 0) {
    throw new Error(`${componentName}'s selectedTabIndex must be undefined if there is no tab to select.`);
  }

  if ((selectedTabIndex < 0) || (selectedTabIndex > (childrenLength - 1))) {
    throw new Error(`${componentName}'s selectedTabIndex(${selectedTabIndex}) must be within the range defined by the number of tabs.`);
  }
};

/**
 *   children: Each element of this array will be wrapped into KuiTab
 *   onSelectedTabChanged: Arguments: tabIndex
 */
KuiTabs.propTypes = {
  children: PropTypes.node,
  selectedTabIndex: selectedTabIndexCheck,
  onSelectedTabChanged: PropTypes.func.isRequired,
  className: React.PropTypes.string
};
