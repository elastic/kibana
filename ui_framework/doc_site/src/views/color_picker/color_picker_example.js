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

import { ColorPickerLabelAndClear } from './color_picker_clear';
const colorPickerClearSource = require('!!raw!./color_picker_clear');
const colorPickerClearHtml = renderToHtml(ColorPickerLabelAndClear);

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
    <GuideSection
      title="Color Picker with a label, reset link, and no color label"
      source={[{
        type: GuideSectionTypes.JS,
        code: colorPickerClearSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: colorPickerClearHtml,
      }]}
    >
      <GuideDemo>
        <ColorPickerLabelAndClear />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
