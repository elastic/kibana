import React from 'react';

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
        <strong>Note:</strong> Don't use this. It's subject to change as we evolve our grid system.
      </GuideText>

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
