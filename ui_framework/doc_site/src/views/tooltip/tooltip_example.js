import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import TooltipExamples from './examples';
const examplesSource = require('!!raw-loader!./examples');
const examplesHtml = renderToHtml(TooltipExamples);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Tooltip"
      source={[{
        type: GuideSectionTypes.JS,
        code: examplesSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: examplesHtml,
      }]}
    >
      <GuideText>
        Warning: This component is still undergoing active development, and its interface and implementation
        are both subject to change.
      </GuideText>

      <GuideDemo>
        <TooltipExamples />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
