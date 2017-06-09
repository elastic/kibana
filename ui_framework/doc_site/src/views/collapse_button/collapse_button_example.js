import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import CollapseButton from './collapse_button';
const collapseButtonSource = require('!!raw!./collapse_button');
const collapseButtonHtml = renderToHtml(CollapseButton);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="CollapseButton"
      source={[{
        type: GuideSectionTypes.JS,
        code: collapseButtonSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: collapseButtonHtml,
      }]}
    >
      <GuideText>
        Use this button to collapse and expand panels, drawers, sidebars, legends, and other
        containers.
      </GuideText>

      <GuideDemo>
        <CollapseButton />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
