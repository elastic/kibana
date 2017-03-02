import React from 'react';
import _ from 'lodash';

import { KuiToolBarFooterSection, KuiToolBar } from './index';

export function KuiToolBarFooter({ sections }) {
  let id = 0;
  const sectionElements = _.map(sections, (section) => {
    id++;
    return <KuiToolBarFooterSection key={id}>{section}</KuiToolBarFooterSection>;
  });
  return <div className="kuiToolBarFooter">{sectionElements}</div>;
}

KuiToolBarFooter.propTypes = {
  sections: React.PropTypes.node
};
