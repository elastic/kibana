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
      text={
        <p>
          <KuiCode>HorizontalRule</KuiCode> can carry a size. By default it will be full.
        </p>
      }
      demo={
        <HorizontalRule />
      }
    />

    <GuideSection
      title="HorizontalRule margins"
      source={[{
        type: GuideSectionTypes.JS,
        code: horizontalRuleMarginSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: horizontalRuleMarginHtml,
      }]}
      text={
        <p>
          <KuiCode>HorizontalRule</KuiCode> margins can also be defined. Don&rsquo;t forget that
          margins will collapse against items that proceed / follow.
        </p>
      }
      demo={
        <HorizontalRuleMargin />
      }
    />
  </GuidePage>
);
