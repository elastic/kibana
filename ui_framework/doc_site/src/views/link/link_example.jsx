import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideText,
} from '../../components';

const linkHtml = require('./link.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Link"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: linkHtml,
      }]}
    >
      <GuideDemo
        html={linkHtml}
      />
    </GuideSection>
  </GuidePage>
);
