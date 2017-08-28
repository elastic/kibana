import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
} from '../../../../components';

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
      text={
        <p>
          <KuiCode>KuiSideNav</KuiCode> is a responsive menu system that usually sits on the left side of a page layout.
          It will exapand to the width of its container.
        </p>
      }
      demo={
        <SideNav />
      }
    />
  </GuidePage>
);
