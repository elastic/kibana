import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const barHtml = require('./bar.html');
const oneSectionHtml = require('./bar_one_section.html');
const threeSectionsHtml = require('./bar_three_sections.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Bar"
      source={[{
        type: GuideSectionTypes.HTML,
        code: barHtml,
      }]}
    >
      <GuideText>
        Use the Bar to organize controls in a horizontal layout. This is especially useful for
        surfacing controls in the corners of a view.
      </GuideText>

      <GuideText>
        <strong>Note:</strong> Instead of using this component with a Table, try using the
        ControlledTable, ToolBar, and ToolBarFooter components.
      </GuideText>

      <GuideDemo
        html={barHtml}
      />
    </GuideSection>

    <GuideSection
      title="One section"
      source={[{
        type: GuideSectionTypes.HTML,
        code: oneSectionHtml,
      }]}
    >
      <GuideText>
        A Bar with one section will align it to the right, by default. To align it to the left,
        just add another section and leave it empty, or don't use a Bar at all.
      </GuideText>

      <GuideDemo
        html={oneSectionHtml}
      />
    </GuideSection>

    <GuideSection
      title="Three sections"
      source={[{
        type: GuideSectionTypes.HTML,
        code: threeSectionsHtml,
      }]}
    >
      <GuideText>
        Technically the Bar can contain three or more sections, but there's no established use-case
        for this.
      </GuideText>

      <GuideDemo
        html={threeSectionsHtml}
      />
    </GuideSection>
  </GuidePage>
);
