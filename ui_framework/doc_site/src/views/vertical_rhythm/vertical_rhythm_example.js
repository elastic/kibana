import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const verticalRhythmHtml = require('./vertical_rhythm.html');
const verticalRhythmSmallHtml = require('./vertical_rhythm_small.html');
const verticalRhythmAsWrapperHtml = require('./vertical_rhythm_as_wrapper.html');
const verticalRhythmOnComponentHtml = require('./vertical_rhythm_on_component.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="VerticalRhythm"
      source={[{
        type: GuideSectionTypes.HTML,
        code: verticalRhythmHtml,
      }]}
    >
      <GuideText>
        VerticalRhythm creates regular vertical spacing between elements.
      </GuideText>

      <GuideText>
        <strong>Note:</strong> It only works if two adjacent elements have this class applied, in
        which case it will create space between them.
      </GuideText>

      <GuideDemo
        html={verticalRhythmHtml}
      />
    </GuideSection>

    <GuideSection
      title="VerticalRhythmSmall"
      source={[{
        type: GuideSectionTypes.HTML,
        code: verticalRhythmSmallHtml,
      }]}
    >
      <GuideDemo
        html={verticalRhythmSmallHtml}
      />
    </GuideSection>

    <GuideSection
      title="VerticalRhythm as wrapper"
      source={[{
        type: GuideSectionTypes.HTML,
        code: verticalRhythmAsWrapperHtml,
      }]}
    >
      <GuideText>
        Wrap any series of components, e.g. Panel, in the VerticalRhythm component to space them
        apart.
      </GuideText>

      <GuideDemo
        html={verticalRhythmAsWrapperHtml}
      />
    </GuideSection>

    <GuideSection
      title="VerticalRhythm on component"
      source={[{
        type: GuideSectionTypes.HTML,
        code: verticalRhythmOnComponentHtml,
      }]}
    >
      <GuideText>
        You can also apply the VerticalRhythm class directly to components.
      </GuideText>

      <GuideDemo
        html={verticalRhythmOnComponentHtml}
      />
    </GuideSection>
  </GuidePage>
);
