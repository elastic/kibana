import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import VerticalRhythm from './vertical_rhythm';
const verticalRhythmSource = require('!!raw!./vertical_rhythm');
const verticalRhythmHtml = renderToHtml(VerticalRhythm);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="VerticalRhythm"
      source={[{
        type: GuideSectionTypes.JS,
        code: verticalRhythmSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: verticalRhythmHtml,
      }]}
    >
      <GuideText>
        Use the VerticalRhythm component to create vertical space between typographic elements.
      </GuideText>

      <GuideDemo>
        <VerticalRhythm />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
