import React from 'react';

export const KuiToolBarSection = ({ children }) => <div className="kuiToolBarSection">{children}</div>;
KuiToolBarSection.propTypes = { children: React.PropTypes.node };

export const KuiToolBarFooterSection = ({ children }) => <div className="kuiToolBarFooterSection">{children}</div>;
KuiToolBarFooterSection.propTypes = { children: React.PropTypes.node };

export const KuiToolBarText = ({ children }) => <div className="kuiToolBarText">{children}</div>;
KuiToolBarText.propTypes = { children: React.PropTypes.node };

export { KuiToolBarSearchBox } from './kui_tool_bar_search_box';
export { KuiToolBarPagerButtons } from './kui_tool_bar_pager_buttons';
export { KuiToolBarPagerText } from './kui_tool_bar_pager_text';
export { KuiSelectedItemsFooterSection } from './kui_selected_items_footer_section';
export { KuiToolBar } from './tool_bar';
export { KuiToolBarPager } from './kui_tool_bar_pager';
export { KuiToolBarFooter } from './tool_bar_footer';
