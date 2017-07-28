import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import <%= componentExampleName %> from './<%= fileName %>';
const <%= componentExamplePrefix %>Source = require('!!raw!./<%= fileName %>');
const <%= componentExamplePrefix %>Html = renderToHtml(<%= componentExampleName %>);

export default props => (
  <GuideSandbox>
    <GuideDemo isFullScreen={true}>
      <<%= componentExampleName %> />
    </GuideDemo>

    <GuideSandboxCodeToggle
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: <%= componentExamplePrefix %>Source,
      }, {
        type: GuideSectionTypes.HTML,
        code: <%= componentExamplePrefix %>Html,
      }]}
    />
  </GuideSandbox>
);
