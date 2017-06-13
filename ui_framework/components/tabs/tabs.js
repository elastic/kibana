import React, { cloneElement } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiTab } from './tab';

export class KuiTabs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedTabIx: this.getStartSelectedIx()
    };
  }

  getStartSelectedIx() {
    const tabsLength = this.props.tabs.length;
    const selectedTabIx = this.props.selectedTabIx;

    if (tabsLength > 0) {
      return selectedTabIx ? selectedTabIx : 0;
    } else {
      return undefined;
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.selectedTabIx && (this.state.selectedTabIx !== nextProps.selectedTabIx)) {
      this.setState({ selectedTabIx:nextProps.selectedTabIx });
    }
  }

  render() {
    const {
      tabs,
      onSelectedTabChanged, //eslint-disable-line
      className,
      ...rest
    } = this.props;
    const classes = classNames('kuiTabs', className);
    const children = this.getChildren(tabs);

    return (
      <div
        className={classes}
        {...rest}
      >
        {children}
      </div>
    );
  }

  getChildren(tabs) {
    return tabs.map((tab,ix)=>{
      const props = {
        isSelected: ix === this.state.selectedTabIx,
        onClick: ()=>this.tabClicked(ix),
        key: ix
      };

      return cloneElement(tab,props);
    });
  }

  tabClicked(tabIx) {
    this.setState({ selectedTabIx:tabIx });
    const tabTitle = this.props.tabs[tabIx].props.title;

    this.props.onSelectedTabChanged(tabIx, tabTitle);
  }
}

const selectedTabIxCheck = (props, propName, componentName) => {
  const tabsLength = props.tabs.length;
  const selectedTabIx = props.selectedTabIx;

  if (tabsLength > 0) {
    if ((selectedTabIx !== undefined) && (selectedTabIx < 0) || (selectedTabIx > tabsLength - 1)) {
      return new Error(`${componentName}'s selectedTabIx must be within 0 and tabs count - 1.`);
    }
  } else {
    if (selectedTabIx !== undefined) {
      return new Error(`${componentName}'s selectedTabIx must be undefined if there is no tab to select.`);
    }
  }
};

const kuiTabForKuiTabs = (child) => {
  const props = child.props;

  return child.type === KuiTab
         && props.onClick === undefined
         && props.key === undefined
         && props.isSelected === undefined;
};

const arrayOfKuiTabCheck = (props, propName, componentName) => {
  const tabs = props.tabs;
  const isValid = Array.isArray(tabs)
                  && React.Children.toArray(tabs).every(child => kuiTabForKuiTabs(child));

  if (!isValid) {
    return new Error(`${componentName}'s tabs must be an array of KuiTab without onClick, key, and isSelected properties'.`);
  }
};

/**
 *   selectedTabIx: by this parameter can be set the selected tab programmatically.
 *   onSelectedTabChanged: will be called only if the selection is changed by the user.
 *                         Arguments: tabIx,tabTitle
 */
KuiTabs.propTypes = {
  tabs: arrayOfKuiTabCheck,
  selectedTabIx: selectedTabIxCheck,
  onSelectedTabChanged: PropTypes.func.isRequired,
  className: React.PropTypes.string
};
