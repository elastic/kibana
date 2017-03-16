import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const columnsHtml = require('./columns.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Columns"
      source={[{
        type: GuideSectionTypes.HTML,
        code: columnsHtml,
      }]}
    >
      <GuideText>
        This is a substitute grid system. It uses <GuideCode>display: inline-block</GuideCode>, so
        you need to structure your markup to leave no whitespace between each column.
      </GuideText>

      <GuideDemo
        html={columnsHtml}
      />
    </GuideSection>
  </GuidePage>
);
