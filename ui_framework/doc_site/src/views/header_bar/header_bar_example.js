import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

const headerBarHtml = require('./header_bar.html');
const twoSectionsHtml = require('./header_bar_two_sections.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Header Bar"
      source={[{
        type: GuideSectionTypes.HTML,
        code: headerBarHtml,
      }]}
    >
      <GuideDemo
        html={headerBarHtml}
      />
    </GuideSection>

    <GuideSection
      title="Two sections"
      source={[{
        type: GuideSectionTypes.HTML,
        code: twoSectionsHtml,
      }]}
    >
      <GuideDemo
        html={twoSectionsHtml}
      />
    </GuideSection>
  </GuidePage>
);
