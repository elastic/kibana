import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Page from './page';
const pageSource = require('!!raw!./page');
const pageHtml = renderToHtml(Page);

import PageSimple from './page_simple';
const pageSimpleSource = require('!!raw!./page_simple');
const pageSimpleHtml = renderToHtml(PageSimple);

import PageContentOnly from './page_content_only';
const pageContentOnlySource = require('!!raw!./page_content_only');
const pageContentOnlyHtml = renderToHtml(Page);

import PageContentCenter from './page_content_center';
const pageContentCenterSource = require('!!raw!./page_content_center');
const pageContentCenterHtml = renderToHtml(Page);

import PageContentCenterWithSideBar from './page_content_center_with_side_bar';
const PageContentCenterWithSideBarSource = require('!!raw!./page_content_center_with_side_bar');
const PageContentCenterWithSideBarHtml = renderToHtml(Page);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Page with everything on"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageHtml,
      }]}
      text={
        <p>
          Page layouts are modular and have the ability to add or remove components
          as needed for the design. These examples are colored for illustrative
          purposes only.
        </p>
      }
      demo={
        <div className="guideDemo__highlightLayout"><Page /></div>
      }
    />

    <GuideSection
      title="Simple page with title"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageSimpleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageSimpleHtml,
      }]}
      text={
        <p>
          Most pages don&rsquo;t have sidebars. A lot of our pages don&rsquo;t have extra abilities next to the title.
          Simply exclude those components and everything will still line up.
        </p>
      }
      demo={
        <div className="guideDemo__highlightLayout"><PageSimple /></div>
      }
    />

    <GuideSection
      title="Page with content only"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageContentOnlySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageContentOnlyHtml,
      }]}
      text={
        <p>
          We can further simplify pages by only showing the content.
        </p>
      }
      demo={
        <div className="guideDemo__highlightLayout"><PageContentOnly /></div>
      }
    />

    <GuideSection
      title="Page content centered"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageContentCenterSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageContentCenterHtml,
      }]}
      text={
        <p>
          The page content can be optionally centered either vertically
          or horizontally. This is useful for various empty states.
        </p>
      }
      demo={
        <div className="guideDemo__highlightLayout"><PageContentCenter /></div>
      }
    />

    <GuideSection
      title="Page content centered in a full layout"
      source={[{
        type: GuideSectionTypes.JS,
        code: PageContentCenterWithSideBarSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: PageContentCenterWithSideBarHtml,
      }]}
      text={
        <p>
          Centering the content can happen regardless of layout configuration.
          In this example, we&rsquo;re cetnering within a complex sidebar layout.
        </p>
      }
      demo={
        <div className="guideDemo__highlightLayout"><PageContentCenterWithSideBar /></div>
      }
    />

  </GuidePage>
);
