import React from 'react';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const sideBarHtml = require('./side_bar.html');
const sideBarInnerHtml = require('./side_bar_inner.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Side Bar"
      source={[{
        type: GuideSectionTypes.HTML,
        code: sideBarHtml,
      }]}
    >
      <GuideDemo
        html={sideBarHtml}
      />
    </GuideSection>

    <GuideSection
      title="Side Bar Inner"
      source={[{
        type: GuideSectionTypes.HTML,
        code: sideBarInnerHtml,
      }]}
    >
      <GuideText>
        If you need to wrap the contents in an element, for example a form, you can use the
        <GuideCode>kuiSideBarInner</GuideCode> class to make it work.
      </GuideText>

      <GuideDemo
        html={sideBarInnerHtml}
      />
    </GuideSection>
  </GuidePage>
);
