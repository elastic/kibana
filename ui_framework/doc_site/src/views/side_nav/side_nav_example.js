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

import SideNavInPanel from './side_nav_in_panel';
const sideNavInPanelSource = require('!!raw!./side_nav_in_panel');
const sideNavInPanelHtml = renderToHtml(SideNavInPanel);

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
          <KuiCode>SideNav</KuiCode> is a responsive menu system that usually sits on the left side of a page layout.
          It will exapand to the width of its container. This is the menu that is used on the left side of the
          page you are looking at.
        </p>
      }
      demo={
        <SideNav />
      }
    />

    <GuideSection
      title="SideNav can be used in Panels"
      source={[{
        type: GuideSectionTypes.JS,
        code: sideNavInPanelSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: sideNavInPanelHtml,
      }]}
      text={
        <p>
          <KuiCode>SideNav</KuiCode> accepts a <KuiCode>type=&ldquo;inPanel&rdquo;</KuiCode> prop
          that gives it more contextual styling when included within a <Link to="/page">Panel</Link> (like
          this documentation page). Note that in mobile mode it drops itself down to the original styling
          and still works responsively.
        </p>
      }
      demo={
        <SideNavInPanel />
      }
    />
  </GuidePage>
);
