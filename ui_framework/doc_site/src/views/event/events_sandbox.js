import React from 'react';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

const html = require('./events_sandbox.html');

export default props => (
  <GuideSandbox>
    <GuideDemo
      isFullScreen={true}
      html={html}
    />

    <GuideSandboxCodeToggle
      source={[{
        type: GuideSectionTypes.HTML,
        code: html,
      }]}
      title={props.route.name}
    />
  </GuideSandbox>
);
