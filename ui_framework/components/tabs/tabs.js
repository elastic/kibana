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
  const childrenLength = props.children.length;
  const selectedTabIndex = props.selectedTabIndex;

  if (childrenLength > 0) {
    if ((selectedTabIndex !== undefined) && (selectedTabIndex < 0) || (selectedTabIndex > childrenLength - 1)) {
      return new Error(`${componentName}'s selectedTabIndex must be within 0 and tabs count - 1.`);
    }
  } else {
    if (selectedTabIndex !== undefined) {
      return new Error(`${componentName}'s selectedTabIndex must be undefined if there is no tab to select.`);
    }
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
