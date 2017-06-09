import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import { renderToHtml } from '../../services';

import { ColorPicker } from './color_picker';
const colorPickerSource = require('!!raw!./color_picker');
const colorPickerHtml = renderToHtml(ColorPicker);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Color Picker"
      source={[{
        type: GuideSectionTypes.JS,
        code: colorPickerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: colorPickerHtml,
      }]}
    >
      <GuideDemo>
        <ColorPicker />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
