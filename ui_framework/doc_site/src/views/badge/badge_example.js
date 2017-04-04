import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const defaultHtml = require('./default_badge.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Default Badge"
      source={[{
        type: GuideSectionTypes.HTML,
        code: defaultHtml,
      }]}
    >
      <GuideText>
        Use the Default Badge to signify a neutral status of a document or object.
      </GuideText>

      <GuideDemo
        html={defaultHtml}
      />
    </GuideSection>
  </GuidePage>
);
