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

import Text from './text';
const textSource = require('!!raw!./text');
const textHtml = renderToHtml(Text);

import TextSmall from './text_small';
const textSmallSource = require('!!raw!./text_small');
const textSmallHtml = renderToHtml(Text);

import TextColor from './text_color';
const textColorSource = require('!!raw!./text_color');
const textColorHtml = renderToHtml(TextColor);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Text"
      source={[{
        type: GuideSectionTypes.JS,
        code: textSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textHtml,
      }]}
      text={
        <p>
          <KuiCode>KuiText</KuiCode> is a generic catchall wrapper that will apply
          our standard typography styling and spacing to naked HTML. Because of
          its forced style it <strong>only accepts raw HTML</strong> and can
          not / should not be used to wrap React components (which would break
          their styling).
        </p>
      }
      demo={
        <Text />
      }
    />

    <GuideSection
      title="TextSmall"
      source={[{
        type: GuideSectionTypes.JS,
        code: textSmallSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textSmallHtml,
      }]}
      demo={
        <TextSmall />
      }
    />

    <GuideSection
      title="TextColor"
      source={[{
        type: GuideSectionTypes.JS,
        code: textColorSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textColorHtml,
      }]}
      text={
        <p>
          Any text element can be colored as needed. Wraps the element in a span
          with the <KuiCode>!important</KuiCode> applied to the color.
        </p>
      }
      demo={
        <TextColor />
      }
    />
  </GuidePage>
);
