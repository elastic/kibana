import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import PageTitle from './page_title';
const pageTitleSource = require('!!raw!./page_title');
const pageTitleHtml = renderToHtml(PageTitle);

import SectionTitle from './section_title';
const sectionTitleSource = require('!!raw!./section_title');
const sectionTitleHtml = renderToHtml(SectionTitle);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="PageTitle"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageTitleHtml,
      }]}
    >
      <GuideText>
        The <GuideCode>PageTitle</GuideCode> component identifies the page you're on. Generally, there should
        only be one of these used at a time.
      </GuideText>

      <GuideText>
        You can specify which heading element to use by passing it in
        as a child. The heading element can be absolutely anything.
      </GuideText>

      <GuideDemo>
        <PageTitle />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="SectionTitle"
      source={[{
        type: GuideSectionTypes.JS,
        code: sectionTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: sectionTitleHtml,
      }]}
    >
      <GuideText>
        The <GuideCode>SectionTitle</GuideCode> component identifies sections within a page.
      </GuideText>

      <GuideDemo>
        <SectionTitle />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
