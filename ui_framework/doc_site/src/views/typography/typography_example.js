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

import {
  KuiCallOut,
} from '../../../../components';

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

import SmallText from './small_text';
const smallTextSource = require('!!raw!./small_text');
const smallTextHtml = renderToHtml(SmallText);

export default props => (
  <GuidePage title={props.route.name}>
    <KuiCallOut
      title="When to use KuiText and when to use KuiTitle?"
      type="info"
    >
      <p>
        <GuideCode>KuiText</GuideCode> is a catchall component that will style
        any text content you throw at it, headings included. Think of it how a markdown
        renderer works, but for raw HTML. That means it excells at quickly
        styling <strong>articles of text</strong> (like this callout, a toast
        noticiation or instruction text above a form), but is terrible for styling
        titles within page layouts (where you do not want the margins). When
        building a layout, you should always use <GuideCode>KuiTitle</GuideCode>
        instead because it does not try to automatically set margins for you.
      </p>
    </KuiCallOut>
    <br/>
    <br/>
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

    <GuideSection
      title="Small Text"
      source={[{
        type: GuideSectionTypes.JS,
        code: smallTextSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: smallTextHtml,
      }]}
    >
      <GuideText>
        For less-important paragraphs.
      </GuideText>

      <GuideDemo>
        <SmallText />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
