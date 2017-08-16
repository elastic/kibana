import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import ShiftNav from './shift_nav';
const shiftNavSource = require('!!raw!./shift_nav');
const shiftNavHtml = renderToHtml(ShiftNav);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ShiftNav"
      source={[{
        type: GuideSectionTypes.JS,
        code: shiftNavSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: shiftNavHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the ShiftNav component.
      </GuideText>

      <GuideDemo>
        <ShiftNav />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
