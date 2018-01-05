import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import { renderToHtml } from '../../services';

import { ColorPicker } from './color_picker';
const colorPickerSource = require('!!raw-loader!./color_picker');
const colorPickerHtml = renderToHtml(ColorPicker);

import { ColorPickerLabelAndClear } from './color_picker_clear';
const colorPickerClearSource = require('!!raw-loader!./color_picker_clear');
const colorPickerClearHtml = renderToHtml(ColorPickerLabelAndClear);

import { ColorPickerNoColorLabel } from './color_picker_no_color_label';
const colorPickerNoColorLabelSource = require('!!raw-loader!./color_picker_no_color_label');
const colorPickerNoColorLabelHtml = renderToHtml(ColorPickerNoColorLabel);

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
      title="Color Picker with label and reset link"
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
    <GuideSection
      title="Color Picker without a color label"
      source={[{
        type: GuideSectionTypes.JS,
        code: colorPickerNoColorLabelSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: colorPickerNoColorLabelHtml,
      }]}
    >
      <GuideDemo>
        <ColorPickerNoColorLabel />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
