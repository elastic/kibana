import React from 'react';
import _ from 'lodash';

import { KuiToolBarSection } from './index';

export function KuiToolBar({ sections }) {
  let id = 0;
  const sectionElements = _.map(sections, (section) => {
    id++;
    return <KuiToolBarSection key={id}>{section}</KuiToolBarSection>;
  });
  return <div className="kuiToolBar">{sectionElements}</div>;
}

KuiToolBar.propTypes = {
  sections: React.PropTypes.node
};
