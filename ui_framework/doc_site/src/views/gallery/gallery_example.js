import React from 'react';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

const galleryHtml = require('./gallery.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Gallery"
      source={[{
        type: GuideSectionTypes.HTML,
        code: galleryHtml,
      }]}
    >
      <GuideDemo
        html={galleryHtml}
      />
    </GuideSection>
  </GuidePage>
);
