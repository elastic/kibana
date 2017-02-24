import React from 'react';
import _ from 'lodash';

import { KuiToolBarSection, KuiToolBar } from './index';

export function KuiSectionedToolBar({ sections }) {
  let id = 0;
  const sectionElements = _.map(sections, (section) => {
    id++;
    return <KuiToolBarSection key={id}>{section}</KuiToolBarSection>;
  });
  return <KuiToolBar>{sectionElements}</KuiToolBar>;
}

KuiSectionedToolBar.propTypes = {
  sections: React.PropTypes.node
};
