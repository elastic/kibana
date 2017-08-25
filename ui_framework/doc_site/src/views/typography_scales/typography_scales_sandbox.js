import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import TypographyScales from './typography_scales';
const typographyScalesSource = require('!!raw!./typography_scales');
const typographyScalesHtml = renderToHtml(TypographyScales);

export default props => (
  <GuideSandbox>
    <GuideDemo isFullScreen={true}>
      <TypographyScales />
    </GuideDemo>

    <GuideSandboxCodeToggle
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: typographyScalesSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: typographyScalesHtml,
      }]}
    />
  </GuideSandbox>
);
