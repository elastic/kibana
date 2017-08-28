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

import TextScaling from './text_scaling';
const textScalingSource = require('!!raw!./text_scaling');
const textScalingHtml = renderToHtml(TextScaling);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title={props.route.name}
      source={[{
        type: GuideSectionTypes.JS,
        code: textScalingSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: textScalingHtml,
      }]}
      text={
        <p>
          This demo shows off <KuiCode>KuiText</KuiCode> scaling in both
          the default and small sizes. The goal is that the bottom of
          every text line should hit one of the 8px grid lines. This is
          for development only. Do not copy this code into a production environment.
        </p>
      }
      demo={
        <TextScaling />
      }
    />
  </GuidePage>
);
