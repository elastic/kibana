import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import ComboBox from './combo_box';
const comboBoxSource = require('!!raw!./combo_box');
const comboBoxHtml = renderToHtml(ComboBox);

import ComboBoxSmall from './combo_box_small';
const comboBoxSmallSource = require('!!raw!./combo_box_small');
const comboBoxSmallHtml = renderToHtml(ComboBoxSmall);

import ComboBoxLarge from './combo_box_large';
const comboBoxLargeSource = require('!!raw!./combo_box_large');
const comboBoxLargeHtml = renderToHtml(ComboBoxLarge);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ComboBox"
      source={[{
        type: GuideSectionTypes.JS,
        code: comboBoxSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: comboBoxHtml,
      }]}
    >
      <GuideDemo>
        <ComboBox />
      </GuideDemo>
    </GuideSection>

    {/*<GuideSection
      title="ComboBox, small"
      source={[{
        type: GuideSectionTypes.JS,
        code: comboBoxSmallSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: comboBoxSmallHtml,
      }]}
    >
      <GuideDemo>
        <ComboBoxSmall />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ComboBox, large"
      source={[{
        type: GuideSectionTypes.JS,
        code: comboBoxLargeSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: comboBoxLargeHtml,
      }]}
    >
      <GuideDemo>
        <ComboBoxLarge />
      </GuideDemo>
    </GuideSection>*/}
  </GuidePage>
);
