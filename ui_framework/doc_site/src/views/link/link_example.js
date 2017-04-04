import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
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
    </GuideSection>
  </GuidePage>
);
