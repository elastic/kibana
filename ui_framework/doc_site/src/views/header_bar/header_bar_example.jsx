import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideCode,
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
} from '../../components';

const headerBarHtml = require('./header_bar.html');
const twoSectionsHtml = require('./header_bar_two_sections.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Header Bar"
      source={[{
        type: GuideSection.TYPES.HTML,
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
        type: GuideSection.TYPES.HTML,
        code: twoSectionsHtml,
      }]}
    >
      <GuideDemo
        html={twoSectionsHtml}
      />
    </GuideSection>
  </GuidePage>
);
