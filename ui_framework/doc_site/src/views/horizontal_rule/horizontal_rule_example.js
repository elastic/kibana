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
        Description needed: how to use the <GuideCode>HorizontalRule</GuideCode> component.
      </GuideText>

      <GuideDemo>
        <HorizontalRule />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
