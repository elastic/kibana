import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
} from '../../../../components';

import ComboBox from './combo_box';
const comboBoxSource = require('!!raw!./combo_box');
const comboBoxHtml = renderToHtml(ComboBox);

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
      text={
        <p>
          Description needed: how to use the <KuiCode>ComboBox</KuiCode> component.
        </p>
      }
      demo={<ComboBox />}
    />
  </GuidePage>
);
