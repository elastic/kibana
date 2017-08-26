import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import TextScaling from './text_scaling';
const textScalingSource = require('!!raw!./text_scaling');
const textScalingHtml = renderToHtml(TextScaling);

export default props => (
  <GuideSandbox>
    <GuideDemo isFullScreen={true}>
      <TextScaling />
    </GuideDemo>

    <GuideSandboxCodeToggle
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: textScalingSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textScalingHtml,
      }]}
    />
  </GuideSandbox>
);
