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

import Typography from './typography';
const typographySource = require('!!raw!./typography');
const typographyHtml = renderToHtml(Typography);

import PageTitle from './page_title';
const pageTitleSource = require('!!raw!./page_title');
const pageTitleHtml = renderToHtml(PageTitle);

import SectionTitle from './section_title';
const sectionTitleSource = require('!!raw!./section_title');
const sectionTitleHtml = renderToHtml(SectionTitle);

import ObjectTitle from './object_title';
const objectTitleSource = require('!!raw!./object_title');
const objectTitleHtml = renderToHtml(ObjectTitle);

import Text from './text';
const textSource = require('!!raw!./text');
const textHtml = renderToHtml(Text);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Typography"
      source={[{
        type: GuideSectionTypes.JS,
        code: typographySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: typographyHtml,
      }]}
    >
      <GuideDemo>
        <Typography />
      </GuideDemo>
    </GuideSection>

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

    <GuideSection
      title="ObjectTitle"
      source={[{
        type: GuideSectionTypes.JS,
        code: objectTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: objectTitleHtml,
      }]}
    >
      <GuideText>
        This component identifies subsections within a section.
      </GuideText>

      <GuideDemo>
        <ObjectTitle />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Text"
      source={[{
        type: GuideSectionTypes.JS,
        code: textSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textHtml,
      }]}
    >
      <GuideText>
        You'll generally use this component for paragraphs.
      </GuideText>

      <GuideDemo>
        <Text />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
