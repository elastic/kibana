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
const tabsSource = require('!!raw-loader!./tabs');
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
        The <GuideCode>KuiTabs</GuideCode> component should have
        <GuideCode>KuiTab</GuideCode> components as children.
      </GuideText>

      <GuideDemo>
        <Tabs />
      </GuideDemo>

      <GuideText>
        Dark themed tabs
      </GuideText>
      <GuideDemo isDarkTheme={true}>
        <Tabs />
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);
