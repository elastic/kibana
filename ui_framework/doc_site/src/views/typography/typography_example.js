import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Typography from './typography';
const typographySource = require('!!raw!./typography');
const typographyHtml = renderToHtml(Typography);

import LargeTitle from './large_title';
const pageTitleSource = require('!!raw!./large_title');
const pageTitleHtml = renderToHtml(LargeTitle);

import MediumTitle from './medium_title';
const sectionTitleSource = require('!!raw!./medium_title');
const sectionTitleHtml = renderToHtml(MediumTitle);

import SmallTitle from './small_title';
const objectTitleSource = require('!!raw!./small_title');
const objectTitleHtml = renderToHtml(SmallTitle);

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
      title="Large Title"
      source={[{
        type: GuideSectionTypes.JS,
        code: pageTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pageTitleHtml,
      }]}
    >
      <GuideText>
        The large size is usually used to identify the page you&rsquo;re on. Generally, there should
        only be one of these used at a time.
      </GuideText>

      <GuideText>
        You can specify which heading element to use by passing it in
        as a child. The heading element can be absolutely anything.
      </GuideText>

      <GuideDemo>
        <LargeTitle />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Medium Title"
      source={[{
        type: GuideSectionTypes.JS,
        code: sectionTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: sectionTitleHtml,
      }]}
    >
      <GuideText>
        This size is commonly used to identify sections within a page. It&rsquo;s also the default size.
      </GuideText>

      <GuideDemo>
        <MediumTitle />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Small Title"
      source={[{
        type: GuideSectionTypes.JS,
        code: objectTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: objectTitleHtml,
      }]}
    >
      <GuideText>
        This size is commonly used to identify subsections within a section.
      </GuideText>

      <GuideDemo>
        <SmallTitle />
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
        You&rsquo;ll generally use this component for paragraphs.
      </GuideText>

      <GuideDemo>
        <Text />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
