import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const collapseButtonHtml = require('./collapse_button.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="CollapseButton"
      source={[{
        type: GuideSectionTypes.HTML,
        code: collapseButtonHtml,
      }]}
    >
      <GuideText>
        Use this button to collapse and expand panels, drawers, sidebars, legends, and other
        containers.
      </GuideText>

      <GuideDemo
        html={collapseButtonHtml}
      />
    </GuideSection>
  </GuidePage>
);
