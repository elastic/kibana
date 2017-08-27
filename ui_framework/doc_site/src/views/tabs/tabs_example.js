import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
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
      text={
        <p>
          The <GuideCode>KuiTabs</GuideCode> component should have <GuideCode>KuiTab</GuideCode>
          components as children.
        </p>
      }
      demo={
        <Tabs />
      }
    />
  </GuidePage>
);
