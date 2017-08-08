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
        The SideNav is a responsive menu system that usually sits on the left side of a page layout.
        It will exapand to the width of its container.
      </GuideText>

      <GuideText>
        SideNavItems accept both button and anchor elements.
      </GuideText>

      <GuideDemo>
        <SideNav />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
