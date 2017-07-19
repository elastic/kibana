import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideText,
  GuideSectionTypes,
} from '../../components';

const headerHtml = require('./header.html');
const headerJs = require('raw!./header.js');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Header"
      source={[{
        type: GuideSectionTypes.HTML,
        code: headerHtml,
      }, {
        type: GuideSectionTypes.JS,
        code: headerJs,
      }]}
    >
      <GuideText>
        Global nav / header.
      </GuideText>

      <GuideDemo
        html={headerHtml}
        js={headerJs}
      />
    </GuideSection>

  </GuidePage>
);
