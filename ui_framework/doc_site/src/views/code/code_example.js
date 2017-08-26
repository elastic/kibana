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

import Code from './code';
const codeSource = require('!!raw!./code');
const codeHtml = renderToHtml(Code);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Code"
      source={[{
        type: GuideSectionTypes.JS,
        code: codeSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: codeHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the <GuideCode>Code</GuideCode> component.
      </GuideText>

      <GuideDemo>
        <Code />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
