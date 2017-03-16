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
  GuideSectionTypes,
} from '../../components';

const fieldGroupHtml = require('./field_group.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="FieldGroup"
      source={[{
        type: GuideSectionTypes.HTML,
        code: fieldGroupHtml,
      }]}
    >
      <GuideDemo
        html={fieldGroupHtml}
      />
    </GuideSection>
  </GuidePage>
);
