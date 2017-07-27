import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
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
    >
      <GuideText>
        Page layouts are modular and have the ability to add or remove components
        as needed for the design. These examples are colored for illustrative
        purposes only.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightLayout"><Page /></div>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Simple page with title"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageSimpleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageSimpleHtml,
      }]}
    >
      <GuideText>
        Page layouts are modular and have the ability to add or remove components
        as needed for the design. These examples are colored for illustrative
        purposes only.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightLayout"><PageSimple /></div>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Page with content only"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageContentOnlySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageContentOnlyHtml,
      }]}
    >
      <GuideText>
        Page layouts are modular and have the ability to add or remove components
        as needed for the design. These examples are colored for illustrative
        purposes only.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightLayout"><PageContentOnly /></div>
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);
