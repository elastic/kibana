import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

const linkHtml = require('./link.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Link"
      source={[{
        type: GuideSectionTypes.HTML,
        code: linkHtml,
      }]}
    >
      <GuideDemo
        html={linkHtml}
      />

      <GuideDemo
        html={linkHtml}
        isDarkTheme={true}
      />
    </GuideSection>
  </GuidePage>
);
