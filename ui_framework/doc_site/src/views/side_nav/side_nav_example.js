import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import SideNav from './side_nav';
const sideNavSource = require('!!raw!./side_nav');
const sideNavHtml = renderToHtml(SideNav);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="SideNav"
      source={[{
        type: GuideSectionTypes.JS,
        code: sideNavSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: sideNavHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the SideNav component.
      </GuideText>

      <GuideDemo>
        <SideNav />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
