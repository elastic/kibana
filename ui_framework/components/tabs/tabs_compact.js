import React from 'react';
import PropTypes from 'prop-types';
import { KuiTab } from './tab';
import { KuiTabs } from './tabs';

export const KuiTabsCompact = ({ tabTexts, ...rest }) => {
  const tabs = tabTexts.map(tabText=><KuiTab title={tabText}/>);

  return (
    <KuiTabs
      tabs={tabs}
      {...rest}
    />
  );
};

/**
 *   The same properties as of KuiTabs except
 *   there is a tabTexts property instead of the tabs property.
 *   See its doc.
 */
KuiTabsCompact.propTypes = {
  tabTexts: PropTypes.arrayOf(PropTypes.string).isRequired,
};
