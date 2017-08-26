import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import InlineForms from './inline_forms';
const inlineFormsSource = require('!!raw!./inline_forms');
const inlineFormsHtml = renderToHtml(InlineForms);

export default props => (
  <GuideSandbox>
    <GuideDemo isFullScreen={true}>
      <InlineForms />
    </GuideDemo>

    <GuideSandboxCodeToggle
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: inlineFormsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: inlineFormsHtml,
      }]}
    />
  </GuideSandbox>
);
