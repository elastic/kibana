import React from 'react';

import { Link } from 'react-router';

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

import SideNavAlternate from './side_nav_alternate';
const sideNavAlternateSource = require('!!raw!./side_nav_alternate');
const sideNavAlternateHtml = renderToHtml(SideNavAlternate);

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
          It will exapand to the width of its container. This is the menu that is used on the left side of the
          page you are looking at.
        </p>
      }
      demo={
        <SideNav />
      }
    />

    <GuideSection
      title="SideNav has an alternate style for within panels"
      source={[{
        type: GuideSectionTypes.JS,
        code: sideNavAlternateSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: sideNavAlternateHtml,
      }]}
      text={
        <p>
          <KuiCode>SideNav</KuiCode> can pass an <KuiCode>alternateStyle</KuiCode> prop
          that gives it more contextial styling when included within a <Link to="/page">Panel</Link> (like
          this documentation page). Note that in mobile mode it drops itself down to the original styling
          and still works responsively.
        </p>
     }
      demo={
        <SideNavAlternate />
     }
    />
  </GuidePage>
);
