import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
  GuideCode
} from '../../components';

import Tabs from './tabs';
const tabsSource = require('!!raw!./tabs');
const tabsHtml = renderToHtml(Tabs);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Tabs"
      source={[{
        type: GuideSectionTypes.JS,
        code: tabsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: tabsHtml,
      }]}
    >
      <GuideText>
        The <GuideCode>KuiTabs</GuideCode> component accepts nodes as children.
        Each child will be wrapped within a <GuideCode>KuiTab</GuideCode> component.
      </GuideText>

      <GuideDemo>
        <Tabs />
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);
