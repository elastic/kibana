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

import HorizontalRule from './horizontal_rule';
const horizontalRuleSource = require('!!raw!./horizontal_rule');
const horizontalRuleHtml = renderToHtml(HorizontalRule);

import HorizontalRuleMargin from './horizontal_rule_margin';
const horizontalRuleMarginSource = require('!!raw!./horizontal_rule_margin');
const horizontalRuleMarginHtml = renderToHtml(HorizontalRuleMargin);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="HorizontalRule"
      source={[{
        type: GuideSectionTypes.JS,
        code: horizontalRuleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: horizontalRuleHtml,
      }]}
    >
      <GuideText>
        <GuideCode>HorizontalRule</GuideCode> can carry a size. By default it will be full.
      </GuideText>

      <GuideDemo>
        <HorizontalRule />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="HorizontalRule margins"
      source={[{
        type: GuideSectionTypes.JS,
        code: horizontalRuleMarginSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: horizontalRuleMarginHtml,
      }]}
    >
      <GuideText>
        <GuideCode>HorizontalRule</GuideCode> margins can also be defined. Don&rsquo;t forget that
        margins will collapse against items that proceed / follow.
      </GuideText>

      <GuideDemo>
        <HorizontalRuleMargin />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
