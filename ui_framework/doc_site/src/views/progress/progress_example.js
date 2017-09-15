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

import Progress from './progress';
const progressSource = require('!!raw!./progress');
const progressHtml = renderToHtml(Progress);

import ProgressValue from './progress_value';
const progressValueSource = require('!!raw!./progress_value');
const progressValueHtml = renderToHtml(ProgressValue);

import ProgressFixed from './progress_fixed';
const progressFixedSource = require('!!raw!./progress_fixed');
const progressFixedHtml = renderToHtml(ProgressFixed);

import ProgressSizeColor from './progress_size_color';
const progressSizeColorSource = require('!!raw!./progress_size_color');
const progressSizeColorHtml = renderToHtml(ProgressSizeColor);

export default props => (
  <GuidePage title={props.route.name}>

    <GuideSection
      title="Progress"
      source={[{
        type: GuideSectionTypes.JS,
        code: progressSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: progressHtml,
      }]}
      text={
        <p>
          The <KuiCode>Progress</KuiCode> component by default will display
          in an indeterminate loading state (rendered as a signle div) until you define
          a <KuiCode>max</KuiCode> and <KuiCode>value</KuiCode> prop.
          The <KuiCode>size</KuiCode> prop refers to its verical height. It will
          always strech <KuiCode>100%</KuiCode> to its container.
        </p>
      }
      demo={<Progress />}
    />

    <GuideSection
      title="Progress with values"
      source={[{
        type: GuideSectionTypes.JS,
        code: progressValueSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: progressValueHtml,
      }]}
      text={
        <p>
          Once the <KuiCode>max</KuiCode> and <KuiCode>value</KuiCode> props
          are set, it will act as a determinate progress bar. This is rendered
          using an HTML5 <KuiCode>progress</KuiCode> tag.
        </p>
     }
      demo={
        <ProgressValue />
     }
    />

    <GuideSection
      title="Progress can have absolute or fixed positions"
      source={[{
        type: GuideSectionTypes.JS,
        code: progressFixedSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: progressFixedHtml,
      }]}
      text={
        <p>
          Using the <KuiCode>position</KuiCode> prop we can align our bar
          to be <KuiCode>fixed</KuiCode> or <KuiCode>absolute</KuiCode>. In both
          options, the background color of the base bar is dropped (since the
          context of width is already known from your wrapping element). For the
          absolute option, make sure that your wrapping element
          has <KuiCode>position: relative</KuiCode> applied.
        </p>
     }
      demo={
        <ProgressFixed />
     }
    />

    <GuideSection
      title="Progress has a range of sizes and colors"
      source={[{
        type: GuideSectionTypes.JS,
        code: progressSizeColorSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: progressSizeColorHtml,
      }]}
      text={
        <p>
          Both <KuiCode>size</KuiCode> and <KuiCode>color</KuiCode> can
          be provided as props. These values will work on both determinate and
          indeterminate progress bars.
        </p>
      }
      demo={
        <ProgressSizeColor />
      }
    />
  </GuidePage>
);
